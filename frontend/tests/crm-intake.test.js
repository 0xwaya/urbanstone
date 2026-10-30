import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabase } from '../lib/supabase';
import { sendWebsiteLeadEmail } from '../lib/lead-email';
import {
    buildChatIntake, buildContractorEstimateIntake, buildFormIntake, isCrmSyncEnabled, saveCrmIntake,
} from '../lib/crm-intake';
import leadHandler from '../pages/api/lead';

vi.mock('../lib/supabase', () => ({ getSupabase: vi.fn() }));
vi.mock('../lib/lead-email', async (importOriginal) => ({ ...(await importOriginal()), sendWebsiteLeadEmail: vi.fn() }));
vi.mock('../lib/lead', async (importOriginal) => {
    const actual = await importOriginal();
    let n = 0;
    return {
        ...actual,
        sanitizeLeadPayload: () => ({
            ok: true,
            data: { name: 'Jamie Test', email: 'jamie@example.com', phone: '(513) 555-0101', projectDetails: `Kitchen island ${(n += 1)}`, totalSquareFootage: 54, materialPreferences: ['quartz'], timeframeGoal: '1-month', routeId: 'homepage', drawingImage: { dataUrl: 'data:image/png;base64,AAAA', type: 'image/png', size: 4 } },
        }),
    };
});

function makeResponse() {
    return {
        headers: {}, statusCode: 200, body: undefined,
        setHeader(name, value) { this.headers[name] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(value) { this.body = value; return this; },
    };
}

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

const formPayload = {
    submittedAt: '2026-10-30T13:00:00.000Z', source: 'urban-stone-site', requestId: 'req-1', dedupeKey: 'abc123', routeId: 'homepage',
    lead: { name: 'Jamie Test', email: 'jamie@example.com', phone: '(513) 555-0101', projectDetails: 'Kitchen island', totalSquareFootage: 54, materialPreferences: ['quartz'], drawingImage: { dataUrl: 'data:image/png;base64,AAAA' } },
    metadata: { requestId: 'req-1', dedupeKey: 'abc123', ip: '203.0.113.9', userAgent: 'UA', routeId: 'homepage' },
};

describe('crm intake mapping', () => {
    it('flag defaults off', () => {
        expect(isCrmSyncEnabled({})).toBe(false);
        expect(isCrmSyncEnabled({ CRM_SYNC_ENABLED: 'true' })).toBe(true);
    });

    it('website form: keyed by dedupeKey, strips drawing image, IP and user agent', () => {
        const body = buildFormIntake(formPayload);
        expect(body.contact).toMatchObject({ person_name: 'Jamie Test', email: 'jamie@example.com', phone: '(513) 555-0101' });
        expect(body.intake).toMatchObject({ source_channel: 'website_form', source_ref: 'abc123', sub_source: 'homepage' });
        expect(body.intake.scope).toContain('Kitchen island');
        const raw = JSON.stringify(body.intake.raw);
        expect(raw).not.toContain('base64');
        expect(raw).not.toContain('203.0.113.9');
        expect(body.intake.raw.hasDrawing).toBe(true);
    });

    it('chat: maps city, zip, summary and contractor segment', () => {
        const body = buildChatIntake({ ...formPayload, routeId: 'ai-chat', chatIntake: { customerSegment: 'contractor-flipper', city: 'Mason 45040', summary: 'Quartz kitchen, 40 sq ft', transcript: [] } });
        expect(body.contact.contact_type).toBe('contractor');
        expect(body.intake).toMatchObject({ source_channel: 'website_chat', project_zip: '45040', scope: 'Quartz kitchen, 40 sq ft' });
    });

    it('contractor estimate: company, location and scope', () => {
        const body = buildContractorEstimateIntake({
            submittedAt: 'x', dedupeKey: 'ce1', routeId: 'contractor-portal',
            estimate: { name: 'Pat Test', email: 'pat@example.com', phone: '513-555-0102', companyName: 'Test Builders', projectName: 'Lofts', projectLocation: '1 Main St, Cincinnati, OH 45202', propertyType: 'multifamily', numberOfUnits: 24, projectDetails: 'Quartz tops' },
            metadata: { ip: '203.0.113.9' },
        });
        expect(body.contact).toMatchObject({ contact_type: 'contractor', company_name: 'Test Builders' });
        expect(body.intake).toMatchObject({ source_channel: 'contractor_estimate', source_ref: 'ce1', project_zip: '45202' });
        expect(JSON.stringify(body.intake.raw)).not.toContain('203.0.113.9');
    });
});

describe('saveCrmIntake', () => {
    it('does nothing when the flag is off', async () => {
        const rpc = vi.fn();
        expect(await saveCrmIntake({}, { env: {}, client: { rpc } })).toEqual({ ok: false, skipped: true });
        expect(rpc).not.toHaveBeenCalled();
    });

    it('calls the RPC when on', async () => {
        const rpc = vi.fn().mockResolvedValue({ data: { created_intake: true }, error: null });
        const out = await saveCrmIntake({ intake: { source_channel: 'website_form' } }, { env: { CRM_SYNC_ENABLED: 'true' }, client: { rpc } });
        expect(rpc).toHaveBeenCalledWith('crm_ingest_intake', { p: { intake: { source_channel: 'website_form' } } });
        expect(out.ok).toBe(true);
    });

    it('never throws on errors or slow responses', async () => {
        const env = { CRM_SYNC_ENABLED: 'true' };
        const failing = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'bad jamie@example.com' } }) };
        const out = await saveCrmIntake({}, { env, client: failing });
        expect(out).toMatchObject({ ok: false });
        expect(out.error).not.toContain('jamie@example.com');
        const slow = { rpc: vi.fn(() => new Promise(() => {})) };
        expect(await saveCrmIntake({}, { env, client: slow, timeoutMs: 20 })).toMatchObject({ ok: false, error: 'timeout after 20ms' });
        getSupabase.mockImplementation(() => { throw new Error('Missing Supabase server environment variables.'); });
        expect(await saveCrmIntake({}, { env })).toMatchObject({ ok: false });
    });
});

describe('/api/lead with CRM sync', () => {
    const request = () => ({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200)}` }, body: {} });

    it('saves to the CRM after the email is sent', async () => {
        vi.stubEnv('RESEND_API_KEY', 'test');
        vi.stubEnv('CRM_SYNC_ENABLED', 'true');
        sendWebsiteLeadEmail.mockResolvedValue({ id: 'email-1' });
        const rpc = vi.fn().mockResolvedValue({ data: { created_intake: true }, error: null });
        getSupabase.mockReturnValue({ rpc });
        const response = makeResponse();
        await leadHandler(request(), response);
        expect(response.statusCode).toBe(202);
        expect(sendWebsiteLeadEmail).toHaveBeenCalledTimes(1);
        expect(rpc).toHaveBeenCalledWith('crm_ingest_intake', expect.objectContaining({ p: expect.objectContaining({ intake: expect.objectContaining({ source_channel: 'website_form' }) }) }));
        expect(sendWebsiteLeadEmail.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[0]);
    });

    it('still returns 202 when the CRM fails', async () => {
        vi.stubEnv('RESEND_API_KEY', 'test');
        vi.stubEnv('CRM_SYNC_ENABLED', 'true');
        sendWebsiteLeadEmail.mockResolvedValue({ id: 'email-2' });
        getSupabase.mockReturnValue({ rpc: vi.fn().mockRejectedValue(new Error('down')) });
        const response = makeResponse();
        await leadHandler(request(), response);
        expect(response.statusCode).toBe(202);
        expect(response.body.id).toBe('email-2');
    });

    it('flag off: no CRM call', async () => {
        vi.stubEnv('RESEND_API_KEY', 'test');
        sendWebsiteLeadEmail.mockResolvedValue({ id: 'email-3' });
        const rpc = vi.fn();
        getSupabase.mockReturnValue({ rpc });
        const response = makeResponse();
        await leadHandler(request(), response);
        expect(response.statusCode).toBe(202);
        expect(sendWebsiteLeadEmail).toHaveBeenCalledTimes(1);
        expect(rpc).not.toHaveBeenCalled();
    });
});
