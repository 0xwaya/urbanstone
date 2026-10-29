import { jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildComboQuery,
    buildPermitLead,
    evaluatePermit,
    getPermitsConfig,
    groupComboRows,
    isPermitsEnabled,
    pollPermits,
    scorePermit,
    summarizePermitRows,
} from '../src/permits.js';
import {
    buildRegistryIndex,
    loadContractorRegistry,
    lookupContractor,
    normalizeCompanyName,
    parseRegistryHtml,
} from '../src/contractor-registry.js';
import { relay } from '../src/relay.js';
import { assessRunHealth } from '../src/run-health.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const comboRows = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'permits-combo.json'), 'utf8'));
const detailRows = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'permits-details.json'), 'utf8'));
const registryHtml = fs.readFileSync(path.join(fixturesDir, 'registry.html'), 'utf8');
const NOW = new Date('2026-10-29T12:00:00Z');

function jsonResponse(data, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => data, text: async () => JSON.stringify(data) };
}

function socrataFetch({ fail = false } = {}) {
    return jest.fn(async (url) => {
        if (fail) throw new Error('network down');
        if (String(url).includes('thvx-5mem')) return jsonResponse(comboRows);
        if (String(url).includes('uhjb-xac9')) return jsonResponse(detailRows);
        throw new Error(`unexpected url ${url}`);
    });
}

function memoryDedup(initial = []) {
    const seen = new Set(initial);
    return { seen, isSeen: (id) => seen.has(id), markSeen: (id) => seen.add(id) };
}

const registryLoader = async () => ({ index: buildRegistryIndex(parseRegistryHtml(registryHtml)), status: 'cache' });

describe('permits switch', () => {
    test('is off by default and only on for truthy values', () => {
        expect(isPermitsEnabled({})).toBe(false);
        expect(isPermitsEnabled({ LEAD_SOURCER_ENABLE_PERMITS: '' })).toBe(false);
        expect(isPermitsEnabled({ LEAD_SOURCER_ENABLE_PERMITS: 'false' })).toBe(false);
        expect(isPermitsEnabled({ LEAD_SOURCER_ENABLE_PERMITS: 'true' })).toBe(true);
        expect(isPermitsEnabled({ LEAD_SOURCER_ENABLE_PERMITS: '1' })).toBe(true);
    });

    test('run health treats a degraded permits source as unhealthy (index.js keeps it warn-only)', () => {
        const health = assessRunHealth(
            { sourceStatuses: { craigslist: 'ok', permits: 'degraded' }, errors: [] },
            { reddit: false, craigslist: true, apify: false, permits: true },
        );
        expect(health.unhealthySources).toEqual(['permits']);
        expect(health.allFailed).toBe(false);
    });
});

describe('permit query, grouping and filters', () => {
    const config = getPermitsConfig({});

    test('config defaults and sanitized keywords', () => {
        expect(config.lookbackDays).toBe(14);
        expect(config.keywords).toEqual(['kitchen', 'bath', 'counter', 'vanity', 'remodel', 'renovat']);
        expect(getPermitsConfig({ LEAD_SOURCER_PERMITS_KEYWORDS: "kitchen,x' OR 1=1" }).keywords).toEqual(['kitchen', 'x or']);
    });

    test('builds a residential, date-bounded keyword query', () => {
        const query = buildComboQuery({ ...config, now: NOW });
        expect(query.$where).toContain("code_book='Residential'");
        expect(query.$where).toContain("date_issued >= '2026-10-15T00:00:00'");
        expect(query.$where).toContain("upper(desc_of_work) like '%KITCHEN%'");
    });

    test('groups duplicate combo rows and picks the building-permit contractor and max cost', () => {
        const permits = groupComboRows(comboRows);
        expect(permits).toHaveLength(7);
        expect(permits[0].address).toBe('3648 SOLAR VISTA PL');
        const details = summarizePermitRows(detailRows);
        expect(details.get('2026P08746')).toMatchObject({ contractor: 'SK DEVELOPMENT GROUP LLC', cost: 18000, zip: '45214' });
    });

    test.each([
        [{ contractor: 'X BUILDERS', description: 'NEW KITCHEN', status: 'ISSUED' }, true, 'match'],
        [{ contractor: 'OWNER', description: 'NEW KITCHEN', status: 'ISSUED' }, false, 'owner-pulled'],
        [{ contractor: '', description: 'NEW KITCHEN', status: 'ISSUED' }, false, 'no-contractor'],
        [{ contractor: 'X BUILDERS', description: 'NEW KITCHEN', status: 'VOID' }, false, 'inactive-status'],
        [{ contractor: 'X BUILDERS', description: 'NEW GARAGE DOOR', status: 'ISSUED' }, false, 'no-keyword'],
        [{ contractor: 'X BUILDERS', description: 'BASEMENT WATERPROOFING, BATH REMODEL', status: 'ISSUED' }, false, 'excluded-trade:basement waterproof'],
        [{ contractor: 'X BUILDERS', description: 'NEW REAR DECK / DRYWALL IN KITCHEN', status: 'ISSUED' }, true, 'match'],
        [{ contractor: 'OHIO BASEMENT AUTHORITY', description: 'BATHROOM REMODEL', status: 'ISSUED' }, false, 'excluded-contractor:basement'],
    ])('evaluatePermit %#', (permit, include, reason) => {
        expect(evaluatePermit(permit, config)).toEqual({ include, reason });
    });

    test('scoring ranks kitchen/counter > bath > remodel with a cost bonus', () => {
        expect(scorePermit({ description: 'NEW COUNTERTOPS', cost: 0 }).score).toBe(70);
        expect(scorePermit({ description: 'KITCHEN UPDATE', cost: 120000 })).toMatchObject({ score: 80, band: 'high' });
        expect(scorePermit({ description: 'BATH REMODEL', cost: 6000 }).score).toBe(50);
        expect(scorePermit({ description: 'INTERIOR REMODEL', cost: 0 })).toMatchObject({ score: 30, band: 'low' });
    });
});

describe('contractor registry', () => {
    test('normalizes company names (case, punctuation, &, legal suffixes)', () => {
        expect(normalizeCompanyName('"Allen & Frey Builders & Remodelers, Inc."')).toBe('ALLEN AND FREY BUILDERS AND REMODELERS');
        expect(normalizeCompanyName('SHUCKTIS REMODELING LLC')).toBe('SHUCKTIS REMODELING');
        expect(normalizeCompanyName('The Meyer Bros & Sons, Inc')).toBe('MEYER BROS AND SONS');
        expect(normalizeCompanyName('L.L.C.')).toBe('L L C');
    });

    test('parses rows, merges types and drops invalid emails', () => {
        const entries = parseRegistryHtml(registryHtml);
        expect(entries).toHaveLength(3);
        const index = buildRegistryIndex(entries);
        expect(lookupContractor(index, 'DYNAMIC CONTRACTORS UNLIMITED')).toMatchObject({
            phone: '513-555-0101', email: 'office@dynamic.example', types: ['General - (1,2,3 Family)', 'Home Improvement'],
        });
        expect(lookupContractor(index, 'ALLEN AND FREY BUILDERS & REMODELERS INC')).toMatchObject({ phone: '513-555-0102', email: '' });
        expect(lookupContractor(index, 'NO CONTACT')).toMatchObject({ phone: '', email: '' });
        expect(lookupContractor(index, 'UNKNOWN CO')).toBeNull();
    });

    test('uses a fresh cache, refetches after TTL, and falls back to stale cache on failure', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-test-'));
        const cachePath = path.join(dir, 'registry.json');
        const fetchImpl = jest.fn(async (url, options = {}) => ({ ok: true, status: 200, text: async () => registryHtml, method: options.method }));
        try {
            const live = await loadContractorRegistry({ fetchImpl, env: {}, now: NOW, cachePath });
            expect(live).toMatchObject({ status: 'live', count: 3 });
            expect(fetchImpl).toHaveBeenCalledTimes(2);
            expect(fetchImpl.mock.calls[1][1].body).toContain('__VIEWSTATE=abc123');

            const cached = await loadContractorRegistry({ fetchImpl, env: {}, now: new Date(NOW.getTime() + 86400000), cachePath });
            expect(cached.status).toBe('cache');
            expect(fetchImpl).toHaveBeenCalledTimes(2);

            const failing = jest.fn(async () => { throw new Error('down'); });
            const stale = await loadContractorRegistry({ fetchImpl: failing, env: {}, now: new Date(NOW.getTime() + 8 * 86400000), cachePath });
            expect(stale).toMatchObject({ status: 'stale-cache', count: 3 });

            const none = await loadContractorRegistry({ fetchImpl: failing, env: {}, now: NOW, cachePath: path.join(dir, 'missing.json') });
            expect(none).toMatchObject({ status: 'unavailable', count: 0 });
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('permit lead mapping', () => {
    test('maps a permit and registry contact onto the shared lead payload', () => {
        const permit = {
            permitNumber: '2026P08754', contractor: 'DYNAMIC CONTRACTORS UNLIMITED', description: 'UPDATE BATHROOMS AND KITCHEN',
            address: '3648 SOLAR VISTA PL', zip: '45213', cost: 120000, issuedAt: '2026-10-19T00:00:00.000', status: 'ISSUED',
            subType: 'Alter Residential', link: 'http://cagis.hamilton-co.org/opal/apd.aspx?QSPerm=2026P08754',
        };
        const payload = buildPermitLead(permit, { phone: '513-555-0101', email: 'office@dynamic.example', types: ['Home Improvement'] });
        expect(payload).toMatchObject({
            source: 'permits',
            dedupeKey: 'permits:2026P08754',
            verdict: 'b2b',
            score: 80,
            lead: {
                name: 'DYNAMIC CONTRACTORS UNLIMITED',
                phone: '513-555-0101',
                email: 'office@dynamic.example',
                externalPostId: 'permits:2026P08754',
                externalPostUrl: permit.link,
            },
            metadata: { routeId: 'lead-sourcer/permits', verdict: 'b2b', internalOnly: true, permitNumber: '2026P08754' },
        });
        expect(payload.lead.projectDetails).toContain('Estimated cost: $120,000');
        expect(payload.lead.projectDetails).toContain('Job address: 3648 SOLAR VISTA PL, Cincinnati, OH 45213');
        expect(payload.lead.projectDetails).toContain('Issued: 2026-10-19');
    });

    test('leaves contact blank when the registry has no match', () => {
        const payload = buildPermitLead({ permitNumber: 'P1', contractor: 'X', description: 'KITCHEN', address: 'A', cost: 0, issuedAt: '' });
        expect(payload.lead).toMatchObject({ email: '', phone: '' });
        expect(payload.lead.projectDetails).toContain('Contractor phone: not in registry');
    });
});

describe('pollPermits', () => {
    test('review-only: filters, enriches, logs without contact data, marks seen and never relays', async () => {
        const dedup = memoryDedup();
        const relayFn = jest.fn();
        const logReview = jest.fn();
        const { matches, stats } = await pollPermits({
            mode: 'review-only', env: {}, fetchImpl: socrataFetch(), now: NOW, loadRegistry: registryLoader, relayFn, logReview, ...dedup,
        });
        expect(relayFn).not.toHaveBeenCalled();
        expect(matches.map((m) => m.dedupeKey)).toEqual(['permits:2026P08754', 'permits:2026P08746', 'permits:2026P09485']);
        expect(stats).toMatchObject({ status: 'ok', fetched: 7, evaluated: 7, matches: 3, rejects: 4, registryStatus: 'cache', registryMatched: 1 });
        expect(stats.rejectReasons).toEqual({ 'excluded-contractor': 1, 'owner-pulled': 1, 'inactive-status': 1, 'no-contractor': 1 });
        expect(dedup.seen.has('permits:2026P08754')).toBe(true);
        expect(JSON.stringify(logReview.mock.calls)).not.toContain('office@dynamic.example');
    });

    test('dedupe: already-seen permits are skipped', async () => {
        const dedup = memoryDedup(['permits:2026P08754', 'permits:2026P08746']);
        const { matches, stats } = await pollPermits({
            mode: 'review-only', env: {}, fetchImpl: socrataFetch(), now: NOW, loadRegistry: registryLoader, logReview: jest.fn(), ...dedup,
        });
        expect(matches.map((m) => m.dedupeKey)).toEqual(['permits:2026P09485']);
        expect(stats.skippedSeen).toBe(2);
    });

    test('live: relays each match and marks seen only after delivery', async () => {
        const dedup = memoryDedup();
        const relayFn = jest.fn(async () => ({ resendSent: true }));
        const { stats } = await pollPermits({
            mode: 'live', env: {}, fetchImpl: socrataFetch(), now: NOW, loadRegistry: registryLoader, relayFn, logReview: jest.fn(), ...dedup,
        });
        expect(relayFn).toHaveBeenCalledTimes(3);
        expect(stats.relayed).toBe(3);
        expect(dedup.seen.size).toBe(3);
    });

    test('sends the optional app token header', async () => {
        const fetchImpl = socrataFetch();
        await pollPermits({ mode: 'dry-run', env: { SOCRATA_APP_TOKEN: 'tok' }, fetchImpl, now: NOW, loadRegistry: registryLoader, logReview: jest.fn(), ...memoryDedup() });
        expect(fetchImpl.mock.calls[0][1].headers['X-App-Token']).toBe('tok');
    });

    test('degrades without throwing when the city API fails', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const { matches, stats } = await pollPermits({ mode: 'live', env: {}, fetchImpl: socrataFetch({ fail: true }), now: NOW, ...memoryDedup() });
        expect(matches).toEqual([]);
        expect(stats.status).toBe('degraded');
        warn.mockRestore();
    });

    test('continues without enrichment when the registry loader throws', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const { stats } = await pollPermits({
            mode: 'review-only', env: {}, fetchImpl: socrataFetch(), now: NOW, logReview: jest.fn(),
            loadRegistry: async () => { throw new Error('registry down'); }, ...memoryDedup(),
        });
        expect(stats).toMatchObject({ status: 'ok', matches: 3, registryStatus: 'unavailable', registryMatched: 0 });
        warn.mockRestore();
    });
});

describe('relay guard for internal-only delivery', () => {
    const saved = { ...process.env };
    afterEach(() => {
        process.env = { ...saved };
        global.fetch = originalFetch;
    });
    const originalFetch = global.fetch;

    test('emails only the internal inbox and skips the webhook for permit leads', async () => {
        process.env.RESEND_API_KEY = 'test-key';
        process.env.LEAD_WEBHOOK_URL = 'https://example.invalid/hook';
        delete process.env.LEAD_SOURCER_ALERT_EMAIL;
        delete process.env.LEAD_SOURCER_WEBHOOK_SECONDARY;
        global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'x' }), text: async () => '' }));
        const log = jest.spyOn(console, 'log').mockImplementation(() => {});
        const payload = buildPermitLead({ permitNumber: 'P1', contractor: 'X', description: 'KITCHEN', address: 'A', cost: 0, issuedAt: '' }, { email: 'owner@contractor.example', phone: '513-555-0100', types: [] });
        await relay(payload);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('https://api.resend.com/emails');
        expect(JSON.parse(options.body).to).toEqual(['sales@urbanstone.co']);
        log.mockRestore();
    });

    test('refuses to send when the recipient would be the lead contact', async () => {
        process.env.RESEND_API_KEY = 'test-key';
        process.env.LEAD_SOURCER_ALERT_EMAIL = 'owner@contractor.example';
        process.env.LEAD_SOURCER_WEBHOOK_SECONDARY = 'false';
        global.fetch = jest.fn();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const payload = buildPermitLead({ permitNumber: 'P1', contractor: 'X', description: 'KITCHEN', address: 'A', cost: 0, issuedAt: '' }, { email: 'Owner@Contractor.example', phone: '', types: [] });
        await expect(relay(payload)).rejects.toThrow(/Relay failed/);
        expect(global.fetch).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});
