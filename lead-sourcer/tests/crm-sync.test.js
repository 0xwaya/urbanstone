import { jest } from '@jest/globals';
import { buildCrmIntake, isCrmSyncEnabled, syncLeadsToCrm, callCrmIngest, scrubError, realCompany, isNetworkError } from '../src/crm-sync.js';
import { buildRunReportText, buildRunReportHtml } from '../src/run-report.js';

// Fake data only; no real contacts.
const lead = (over = {}) => ({
    dedupeKey: 'permits:TEST1',
    score: 82,
    scoreBand: 'hot',
    lead: { name: 'Acme Test Builders LLC', email: 'Owner@Example.com', phone: '555-555-0199', externalPostUrl: 'https://example.com/p/1' },
    metadata: {
        routeId: 'lead-sourcer/permits',
        permitNumber: '2026PTEST1',
        city: 'Cincinnati 45202',
        estimatedCost: 85000,
        workSummary: 'Kitchen remodel',
        permit: { jurisdiction: 'Cincinnati', address: '1 Test St, Cincinnati, OH 45202', recordType: 'Building', description: 'Kitchen remodel with new counters', date: '2026-10-29', status: 'Issued' },
    },
    ...over,
});

const ENV_ON = { CRM_SYNC_ENABLED: 'true', SUPABASE_PROJECT_URL: 'https://proj.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'test-key' };

describe('crm sync', () => {
    test('flag defaults off', () => {
        expect(isCrmSyncEnabled({})).toBe(false);
        expect(isCrmSyncEnabled({ CRM_SYNC_ENABLED: 'false' })).toBe(false);
        expect(isCrmSyncEnabled({ CRM_SYNC_ENABLED: 'TRUE' })).toBe(true);
    });

    test('maps the full lead details and keys the intake by permit number', () => {
        const body = buildCrmIntake(lead(), 'permits', { runId: 'gh-1' });
        expect(body.contact).toEqual({ contact_type: 'contractor', company_name: 'Acme Test Builders LLC', email: 'owner@example.com', phone: '555-555-0199' });
        expect(body.intake).toMatchObject({
            source_channel: 'lead_sourcer', sub_source: 'permit_cincinnati', source_ref: '2026PTEST1', source_run: 'gh-1',
            project_address: '1 Test St, Cincinnati, OH 45202', project_city: 'Cincinnati', project_state: 'OH', project_zip: '45202',
            scope: 'Kitchen remodel with new counters', valuation: 85000,
        });
        expect(body.intake.raw).toMatchObject({ score: 82, scoreBand: 'hot', permitNumber: '2026PTEST1' });
    });

    test('drops placeholder contact values', () => {
        const body = buildCrmIntake(lead({ lead: { name: 'X Co', email: 'auto+abc@urbanstone.co', phone: '+1-000-000-1234' } }), 'permits-hamilton');
        expect(body.contact.email).toBeNull();
        expect(body.contact.phone).toBeNull();
        expect(body.intake.sub_source).toBe('permit_hamilton');
    });

    test('off: makes no network calls', async () => {
        const fetchFn = jest.fn();
        const out = await syncLeadsToCrm([{ payload: lead(), sourceKey: 'permits' }], { env: {}, fetchFn });
        expect(out.enabled).toBe(false);
        expect(fetchFn).not.toHaveBeenCalled();
    });

    test('calls the RPC with service-role headers and records repeats', async () => {
        const fetchFn = jest.fn(async () => ({ ok: true, json: async () => ({ created_intake: false, is_repeat: true, prior_intakes: 1, prior_outbound_emails: 2 }) }));
        const out = await syncLeadsToCrm([{ payload: lead(), sourceKey: 'permits' }], { env: ENV_ON, fetchFn });
        const [url, init] = fetchFn.mock.calls[0];
        expect(url).toBe('https://proj.supabase.co/rest/v1/rpc/crm_ingest_intake');
        expect(init.headers.apikey).toBe('test-key');
        expect(JSON.parse(init.body).p.intake.source_ref).toBe('2026PTEST1');
        expect(out).toMatchObject({ attempted: 1, created: 0, existing: 1, failed: 0 });
        expect(out.repeats).toEqual([{ company: 'Acme Test Builders LLC', permitNumber: '2026PTEST1', priorIntakes: 1, priorEmails: 2 }]);
    });

    test('failures never throw and are scrubbed of contact details', async () => {
        const fetchFn = jest.fn(async () => { throw new Error('boom for owner@example.com 555-555-0199'); });
        const out = await syncLeadsToCrm([{ payload: lead(), sourceKey: 'permits' }], { env: ENV_ON, fetchFn });
        expect(out.failed).toBe(1);
        expect(out.errors[0]).not.toMatch(/example\.com|555-555/);
    });

    test('missing env is a reported failure, not a crash', async () => {
        await expect(callCrmIngest({}, { env: { CRM_SYNC_ENABLED: 'true' } })).rejects.toThrow(/missing/);
        const out = await syncLeadsToCrm([{ payload: lead(), sourceKey: 'permits' }], { env: { CRM_SYNC_ENABLED: 'true' } });
        expect(out.failed).toBe(1);
    });

    test('no leads: pings keep-alive', async () => {
        const fetchFn = jest.fn(async () => ({ ok: true }));
        const out = await syncLeadsToCrm([], { env: ENV_ON, fetchFn });
        expect(fetchFn.mock.calls[0][0]).toMatch(/rpc\/crm_keepalive$/);
        expect(out.keepalive.ok).toBe(true);
    });

    test('generic contractor names are never sent as a company to match on', () => {
        for (const name of ['Anonymous', 'OWNER', 'Home Owner', 'unknown', 'N/A']) expect(realCompany(name)).toBeNull();
        expect(realCompany(' Acme Test Builders LLC ')).toBe('Acme Test Builders LLC');
        expect(buildCrmIntake(lead({ lead: { name: 'Anonymous', email: '', phone: '' } }), 'permits').contact.company_name).toBeNull();
    });

    test('stops after the first network error so a Supabase outage cannot stall the run', async () => {
        const fetchFn = jest.fn(async () => { const e = new Error('The operation was aborted due to timeout'); e.name = 'TimeoutError'; throw e; });
        const entries = [1, 2, 3].map((n) => ({ payload: lead({ metadata: { ...lead().metadata, permitNumber: `2026PTEST${n}` } }), sourceKey: 'permits' }));
        const out = await syncLeadsToCrm(entries, { env: ENV_ON, fetchFn });
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(out).toMatchObject({ attempted: 3, failed: 3, created: 0 });
        expect(out.errors.at(-1)).toMatch(/2 more lead\(s\) not saved: CRM unreachable/);
    });

    test('HTTP errors do not trip the breaker', async () => {
        const fetchFn = jest.fn(async () => ({ ok: false, status: 400, text: async () => 'bad' }));
        const out = await syncLeadsToCrm([lead(), lead()].map((payload) => ({ payload, sourceKey: 'permits' })), { env: ENV_ON, fetchFn });
        expect(fetchFn).toHaveBeenCalledTimes(2);
        expect(isNetworkError(new Error('fetch failed'))).toBe(true);
        expect(isNetworkError(new Error('CRM RPC 400: bad'))).toBe(false);
        expect(out.failed).toBe(2);
    });

    test('scrubError removes emails and phones', () => {
        expect(scrubError('a@b.co (513) 555-0100')).toBe('[email] [number]');
    });

    test('run report shows repeats and errors without contact details', () => {
        const summary = {
            startedAt: '2026-10-30T16:00:00Z', completedAt: '2026-10-30T16:01:00Z', mode: 'live', counts: {}, verdicts: {}, sourceStatuses: {}, errors: [], enabledSources: {}, topLeads: [],
            crm: { enabled: true, created: 1, existing: 1, failed: 1, repeats: [{ company: 'Acme Test Builders LLC', permitNumber: '2026PTEST1', priorIntakes: 1, priorEmails: 2 }], errors: ['X Co: CRM RPC 500'] },
        };
        const text = buildRunReportText(summary);
        expect(text).toMatch(/CRM sync: 1 new intake\(s\), 1 already in CRM, 1 failed/);
        expect(text).toMatch(/REPEAT contractor: Acme Test Builders LLC \(permit 2026PTEST1\)/);
        expect(text).toMatch(/CRM error: X Co: CRM RPC 500/);
        expect(buildRunReportHtml(summary)).toMatch(/REPEAT contractor/);
        delete summary.crm;
        expect(buildRunReportText(summary)).not.toMatch(/CRM/);
    });
});
