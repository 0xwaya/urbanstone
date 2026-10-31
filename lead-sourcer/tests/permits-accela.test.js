import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildDateSearchForm,
    createAccelaClient,
    findNextPageTarget,
    formatAcaDate,
    parseDetailPage,
    parseFormFields,
    parseResultRows,
    pickContractor,
} from '../src/accela.js';
import {
    COUNTY_SOURCES,
    buildCountyPermitLead,
    cityFromAddress,
    evaluateRecordType,
    getAccelaConfig,
    isButlerPermitsEnabled,
    isHamiltonPermitsEnabled,
    pollCountyPermits,
} from '../src/permits-accela.js';
import { buildRegistryIndex } from '../src/contractor-registry.js';
import { relay } from '../src/relay.js';
import { assessRunHealth } from '../src/run-health.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'accela');
const fixture = (name) => fs.readFileSync(path.join(dir, name), 'utf8');
const NOW = new Date('2026-10-29T16:00:00Z');

function htmlResponse(body, { status = 200, cookies = [] } = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { getSetCookie: () => cookies, get: () => null },
        text: async () => body,
    };
}

/** Fake ACA server: GET search page, POST search/pager, GET detail pages. */
function fakeAca({ results, details, failSearch = false }) {
    const calls = [];
    const fetchImpl = jest.fn(async (url, init = {}) => {
        calls.push({ url: String(url), method: init.method || 'GET', headers: init.headers || {}, body: init.body || '' });
        if (failSearch) throw new Error('network down');
        const href = String(url);
        if (href.includes('CapHome.aspx') && (init.method || 'GET') === 'GET') return htmlResponse(fixture('search.html'), { cookies: ['ASP.NET_SessionId=abc; path=/; HttpOnly'] });
        if (href.includes('CapHome.aspx')) {
            const form = new URLSearchParams(init.body);
            const target = form.get('__EVENTTARGET');
            return htmlResponse(fixture(target === 'ctl00$PlaceHolderMain$btnNewSearch' ? results[0] : results[1]));
        }
        const id = new URL(href).searchParams.get('id');
        if (details[id]) return htmlResponse(fixture(details[id]));
        return htmlResponse('not found', { status: 404 });
    });
    return { fetchImpl, calls };
}

const hamiltonServer = () => fakeAca({
    results: ['hamilton-results-1.html', 'hamilton-results-2.html'],
    details: { kitchen: 'hamilton-detail-kitchen.html', owner: 'hamilton-detail-owner.html', nokeyword: 'hamilton-detail-nokeyword.html' },
});
const butlerServer = () => fakeAca({
    results: ['butler-results.html'],
    details: { kitchen: 'butler-detail-kitchen.html', basement: 'butler-detail-basement.html', blank: 'hamilton-detail-owner.html' },
});

function harness(overrides = {}) {
    const seen = new Set();
    return {
        mode: 'review-only',
        env: {},
        now: NOW,
        sleep: jest.fn(async () => {}),
        loadRegistry: jest.fn(async () => ({
            index: buildRegistryIndex([{ name: 'Example Builders LLC', phone: '513-555-0199', email: 'office@example-builders.test', types: ['General Contractor'] }]),
            status: 'cache',
        })),
        isSeen: (id) => seen.has(id),
        markSeen: jest.fn((id) => seen.add(id)),
        relayFn: jest.fn(async () => ({ ok: true })),
        logReview: jest.fn(),
        seen,
        ...overrides,
    };
}

describe('accela parsing', () => {
    test('parses form state and builds the date search postback', () => {
        const fields = parseFormFields(fixture('search.html'));
        expect(fields.__VIEWSTATE).toBe('VS-ONE');
        expect(fields['unchecked$box']).toBeUndefined();
        expect(fields['ctl00$PlaceHolderMain$btnNewSearch']).toBeUndefined();
        const form = buildDateSearchForm(fields, { startDate: '10/22/2026', endDate: '10/29/2026' });
        expect(form['ctl00$PlaceHolderMain$generalSearchForm$txtGSStartDate']).toBe('10/22/2026');
        expect(form.__EVENTTARGET).toBe('ctl00$PlaceHolderMain$btnNewSearch');
        expect(() => buildDateSearchForm({ __VIEWSTATE: 'x' }, { startDate: 'a', endDate: 'b' })).toThrow(/date fields/);
    });

    test('formats ACA dates in Eastern time', () => {
        expect(formatAcaDate(new Date('2026-10-30T02:00:00Z'))).toBe('10/29/2026');
    });

    test('parses result rows, detail links and the pager', () => {
        const rows = parseResultRows(fixture('hamilton-results-1.html'), { origin: 'https://eztrak.cagis.org' });
        expect(rows).toHaveLength(4);
        expect(rows[1]).toMatchObject({ recordNumber: '26HAM-PMT-000101', recordType: 'RCO Alteration', address: '100 TEST RD, ANDERSON TOWNSHIP OH 45244', status: 'Issued' });
        expect(rows[1].detailUrl).toMatch(/^https:\/\/eztrak\.cagis\.org\/CitizenAccess\/Cap\/CapDetail\.aspx\?Module=Building&TabName=Building/);
        expect(findNextPageTarget(fixture('hamilton-results-1.html'))).toBe('ctl00$PlaceHolderMain$dgvPermitList$gdvPermitList$ctl13$ctl14');
        expect(findNextPageTarget(fixture('hamilton-results-2.html'))).toBeNull();
        const butler = parseResultRows(fixture('butler-results.html'), { origin: 'https://aca-prod.accela.com' });
        expect(butler[0].description).toBe('Kitchen remodel with new countertops');
        expect(butler[0].address).toBe('201 TEST WAY, WEST CHESTER OH 45069');
        expect(butler[3].detailUrl).toBe('');
    });

    test('extracts the licensed professional, cost and description from a detail page', () => {
        const detail = parseDetailPage(fixture('hamilton-detail-kitchen.html'));
        expect(detail.description).toBe('Kitchen remodel, new cabinets and countertops, relocate sink');
        expect(detail.cost).toBe(48000);
        expect(detail.owner).toBe('JANE HOMEOWNER');
        expect(pickContractor(detail).contractor).toMatchObject({ company: 'EXAMPLE BUILDERS LLC', role: 'Licensed Professional', phone: '(513) 555-0101', email: 'pat@example-builders.test' });
    });

    test('falls back to the contractor contact and detects owner-pulled permits', () => {
        const butler = parseDetailPage(fixture('butler-detail-kitchen.html'));
        expect(butler.cost).toBe(65000);
        expect(pickContractor(butler).contractor).toMatchObject({ company: 'Sample Kitchens Inc', role: 'Contractor', email: 'chris@sample-kitchens.test' });
        expect(pickContractor(parseDetailPage(fixture('hamilton-detail-owner.html')))).toEqual({ contractor: null, reason: 'owner-pulled' });
        expect(pickContractor({ contacts: [], owner: '' })).toEqual({ contractor: null, reason: 'no-contractor' });
        // Assessor-style owner name: skip the homeowner contact, keep the hired agent's business.
        const homeowner = {
            owner: 'SAMPLE CHARLES L III & ALEX R',
            contacts: [
                { role: 'Primary Contact', name: 'Charles Sample', business: '', phone: '', email: '', licenseType: '' },
                { role: 'Authorizing Agent', name: 'Rob Agent', business: 'Sample Handy LLC', phone: '', email: '', licenseType: '' },
            ],
        };
        expect(pickContractor(homeowner).contractor).toMatchObject({ company: 'Sample Handy LLC', role: 'Authorizing Agent' });
        expect(pickContractor({ ...homeowner, contacts: homeowner.contacts.slice(0, 1) }).reason).toBe('owner-pulled');
    });
});

describe('accela client', () => {
    test('keeps the session cookie, sends Referer/Origin on postbacks and rate limits', async () => {
        const { fetchImpl, calls } = hamiltonServer();
        const sleep = jest.fn(async () => {});
        const client = createAccelaClient({ baseUrl: 'https://eztrak.cagis.org/CitizenAccess', fetchImpl, sleep, minIntervalMs: 1000 });
        const result = await client.searchByDate({ startDate: '10/22/2026', endDate: '10/29/2026' });
        expect(result.records).toHaveLength(6);
        expect(result.pages).toBe(2);
        expect(calls).toHaveLength(3);
        expect(calls[1].headers.Cookie).toBe('ASP.NET_SessionId=abc');
        expect(calls[1].headers.Referer).toMatch(/CapHome\.aspx/);
        expect(calls[1].headers.Origin).toBe('https://eztrak.cagis.org');
        expect(new URLSearchParams(calls[2].body).get('__VIEWSTATE')).toBe('VS-PAGE1');
        expect(sleep).toHaveBeenCalled();
    });

    test('retries transient errors and stops on CSRF/captcha pages', async () => {
        let n = 0;
        const flaky = jest.fn(async () => (n++ === 0 ? htmlResponse('busy', { status: 503 }) : htmlResponse(fixture('hamilton-detail-kitchen.html'))));
        const client = createAccelaClient({ baseUrl: 'https://x.test/A', fetchImpl: flaky, sleep: async () => {}, retries: 2 });
        await expect(client.fetchDetail('https://x.test/A/Cap/CapDetail.aspx?id=1')).resolves.toMatchObject({ cost: 48000 });
        expect(flaky).toHaveBeenCalledTimes(2);

        const csrf = jest.fn(async () => htmlResponse('Potential cross-site request forgery attacks'));
        const blocked = createAccelaClient({ baseUrl: 'https://x.test/A', fetchImpl: csrf, sleep: async () => {}, retries: 2 });
        await expect(blocked.fetchDetail('https://x.test/A/Cap/CapDetail.aspx?id=1')).rejects.toThrow(/CSRF/);
        expect(csrf).toHaveBeenCalledTimes(1);
    });
});

describe('county permit sources', () => {
    test('are opt-in per county', () => {
        expect(isHamiltonPermitsEnabled({})).toBe(false);
        expect(isButlerPermitsEnabled({ LEAD_SOURCER_ENABLE_PERMITS_BUTLER: 'true' })).toBe(true);
        expect(isHamiltonPermitsEnabled({ LEAD_SOURCER_ENABLE_PERMITS_HAMILTON: 'false' })).toBe(false);
        expect(getAccelaConfig({ LEAD_SOURCER_ACCELA_MAX_DETAILS: '5' }).maxDetails).toBe(5);
        expect(getAccelaConfig({}).keywords).toEqual(['kitchen', 'bath', 'counter', 'vanity', 'remodel', 'renovat']);
    });

    test('filters by record type before any detail fetch', () => {
        const config = getAccelaConfig({});
        expect(evaluateRecordType({ recordType: 'RCO Alteration', detailUrl: 'x', status: 'Issued' }, config).include).toBe(true);
        expect(evaluateRecordType({ recordType: 'Residential Additions and Alterations to Existing Home', detailUrl: 'x' }, config).include).toBe(true);
        expect(evaluateRecordType({ recordType: 'RCO Mechanical', detailUrl: 'x' }, config).reason).toBe('excluded-type');
        expect(evaluateRecordType({ recordType: 'RCO New Building', detailUrl: 'x' }, config).reason).toBe('other-type');
        expect(evaluateRecordType({ recordType: 'RCO Repair', detailUrl: 'x', status: 'Void' }, config).reason).toBe('inactive-status');
        expect(evaluateRecordType({ recordType: 'RCO Alteration', detailUrl: '' }, config).reason).toBe('no-detail-link');
        expect(cityFromAddress('100 TEST RD, ANDERSON TOWNSHIP OH 45244')).toBe('ANDERSON TOWNSHIP');
    });

    test('hamilton: type filter, detail fetch for candidates only, owner-pulled skipped, registry enrichment', async () => {
        const { fetchImpl, calls } = hamiltonServer();
        const h = harness({ fetchImpl });
        const { matches, stats } = await pollCountyPermits('hamilton-county', h);
        expect(stats).toMatchObject({ status: 'ok', fetched: 6, typeCandidates: 3, detailFetches: 3, matches: 1, registryMatched: 1, contractorFound: 2 });
        expect(stats.rejectReasons).toMatchObject({ 'excluded-type': 1, 'inactive-status': 1, 'owner-pulled': 1, 'no-keyword': 1 });
        expect(calls.filter((c) => c.url.includes('CapDetail')).map((c) => new URL(c.url).searchParams.get('id'))).toEqual(['kitchen', 'owner', 'nokeyword']);
        expect(calls.some((c) => c.url.includes('agencyCode=CINCINNATI'))).toBe(false);

        const [lead] = matches;
        expect(lead.dedupeKey).toBe('eztrak:26HAM-PMT-000101');
        expect(lead.source).toBe('permits-hamilton');
        expect(lead.metadata.routeId).toBe('lead-sourcer/permits-hamilton');
        expect(lead.metadata.internalOnly).toBe(true);
        expect(lead.verdict).toBe('b2b');
        expect(lead.lead.email).toBe('pat@example-builders.test');
        expect(lead.lead.projectDetails).toMatch(/Contractor: EXAMPLE BUILDERS LLC/);
        expect(lead.lead.projectDetails).toMatch(/Estimated cost: \$48,000/);
        expect(lead.lead.projectDetails).toMatch(/City\/township: ANDERSON TOWNSHIP/);
        expect(h.markSeen).toHaveBeenCalledWith('eztrak:26HAM-PMT-000101');
        // Definitive detail rejects are remembered so the next run doesn't re-fetch them.
        expect(h.markSeen).toHaveBeenCalledWith('eztrak:26HAM-PMT-000103');
        expect(h.markSeen).toHaveBeenCalledWith('eztrak:26HAM-PMT-000104');
        const second = await pollCountyPermits('hamilton-county', h);
        expect(second.stats).toMatchObject({ detailFetches: 0, skippedSeen: 3, matches: 0 });
        expect(h.relayFn).not.toHaveBeenCalled();
        const logged = JSON.stringify(h.logReview.mock.calls);
        expect(logged).not.toMatch(/example-builders\.test|555-01/);
    });

    test('butler: a list line with no keyword still opens the detail page, capped at 20', async () => {
        expect(COUNTY_SOURCES['butler-county'].maxDetails).toBe(20);
        const { fetchImpl, calls } = butlerServer();
        const h = harness({ fetchImpl, mode: 'live' });
        const { matches, stats } = await pollCountyPermits('butler-county', h);
        expect(stats).toMatchObject({ fetched: 5, typeCandidates: 3, detailFetches: 3, matches: 2, relayed: 2 });
        expect(stats.rejectReasons).toMatchObject({ 'excluded-type': 1, 'no-detail-link': 1, 'owner-pulled': 1 });
        expect(stats.rejectReasons['no-keyword']).toBeUndefined();
        expect(calls.filter((c) => c.url.includes('CapDetail')).map((c) => new URL(c.url).searchParams.get('id'))).toEqual(['kitchen', 'basement', 'blank']);
        expect(matches.map((match) => match.dedupeKey)).toEqual(['butler:26BLD-000201', 'butler:26BLD-000202']);
        expect(matches[1].lead.projectDetails).toMatch(/remodel the kitchen/);
        expect(h.relayFn).toHaveBeenCalledTimes(2);

        const savedEnv = { ...process.env };
        const savedFetch = global.fetch;
        const log = jest.spyOn(console, 'log').mockImplementation(() => {});
        try {
            process.env.RESEND_API_KEY = 'test-key';
            process.env.LEAD_WEBHOOK_URL = 'https://hooks.test/abc';
            delete process.env.LEAD_SOURCER_ALERT_EMAIL;
            delete process.env.LEAD_SOURCER_RUN_REPORT_EMAIL;
            global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'x' }), text: async () => '' }));
            await relay(matches[0]);
            expect(global.fetch).toHaveBeenCalledTimes(1);
            const [url, options] = global.fetch.mock.calls[0];
            expect(url).toBe('https://api.resend.com/emails');
            expect(JSON.parse(options.body).to).toEqual(['sales@urbanstone.co']);
        } finally {
            process.env = savedEnv;
            global.fetch = savedFetch;
            log.mockRestore();
        }
    });

    test('caps detail fetches per run and leaves the rest unseen for next time', async () => {
        const { fetchImpl } = hamiltonServer();
        const h = harness({ fetchImpl, env: { LEAD_SOURCER_ACCELA_MAX_DETAILS: '1' } });
        const { stats } = await pollCountyPermits('hamilton-county', h);
        expect(stats).toMatchObject({ detailFetches: 1, detailCapped: 2, matches: 1 });
    });

    test('skips seen permits and degrades without throwing when the portal is down', async () => {
        const { fetchImpl } = hamiltonServer();
        const h = harness({ fetchImpl });
        h.seen.add('eztrak:26HAM-PMT-000101');
        const again = await pollCountyPermits('hamilton-county', h);
        expect(again.stats.skippedSeen).toBe(1);
        expect(again.stats.matches).toBe(0);

        const down = fakeAca({ results: [], details: {}, failSearch: true });
        const result = await pollCountyPermits('butler-county', harness({ fetchImpl: down.fetchImpl }));
        expect(result.stats.status).toBe('degraded');

        const dry = harness({ fetchImpl: hamiltonServer().fetchImpl, mode: 'dry-run' });
        await pollCountyPermits('hamilton-county', dry);
        expect(dry.markSeen).not.toHaveBeenCalled();
        expect(result.matches).toEqual([]);
    });

    test('lead builder works without a registry contact', () => {
        const payload = buildCountyPermitLead(COUNTY_SOURCES['butler-county'], {
            permitNumber: 'B-1', recordType: 'Residential Additions and Alterations to Existing Home', date: '10/28/2026', status: 'Issued',
            address: '1 TEST WAY, HAMILTON OH 45013', description: 'Bath remodel', cost: 0, link: '', contractor: 'Test Co',
        });
        expect(payload.lead.email).toBe('');
        expect(payload.lead.projectDetails).toMatch(/Contractor phone: not listed/);
        expect(payload.submittedAt).toBe('2026-10-28T00:00:00.000Z');
    });

    test('run health treats county permits as opt-in', () => {
        const summary = { sourceStatuses: { permits: 'ok', 'permits-hamilton': 'degraded', 'permits-butler': 'degraded' }, errors: [] };
        expect(assessRunHealth(summary, { permits: true }).unhealthySources).toEqual([]);
        expect(assessRunHealth(summary, { permits: true, 'permits-hamilton': true }).unhealthySources).toEqual(['permits-hamilton']);
    });
});
