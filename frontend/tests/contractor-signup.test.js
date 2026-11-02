import { checkWebsite, detectBotSubmission, getGibberishFlags, verifyTurnstile } from '../lib/contractor-signup';
import { buildContractorRegistrationEvent } from '../lib/contractor-notifications';
import registerHandler from '../pages/api/contractor/register';

function mockRes() {
    const res = { statusCode: 0, body: null, headers: {} };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    res.setHeader = (k, v) => { res.headers[k] = v; };
    res.end = () => res;
    return res;
}

function mockSupabase(captured) {
    return {
        from: () => ({
            insert: (row) => {
                captured.row = row;
                return { select: () => ({ single: async () => ({ data: { id: 'c1', status: row.status, email_verified: false }, error: null }) }) };
            },
        }),
    };
}

describe('contractor sign-up hardening', () => {
    it('detects honeypot and too-fast submissions', () => {
        const now = 100_000;
        expect(detectBotSubmission({ company_fax: 'x', form_started_at: 1 }, now)).toBe('honeypot');
        expect(detectBotSubmission({ form_started_at: now - 500 }, now)).toBe('too_fast');
        expect(detectBotSubmission({}, now)).toBe('missing_timer');
        expect(detectBotSubmission({ form_started_at: now - 10_000 }, now)).toBeNull();
    });

    it('flags the known junk pattern but not normal contractors', () => {
        expect(getGibberishFlags({ email: 'e.c.ipuf.ur.5.18@gmail.com', companyName: 'Zasjpgb LLC', website: 'https://akqdgwlwpkx.com' }))
            .toEqual(expect.arrayContaining(['gibberish_name', 'dotted_gmail', 'gibberish_domain']));
        expect(getGibberishFlags({ email: 'john.smith@gmail.com', companyName: 'Apex Builders LLC', website: 'https://apexbuilders.com' })).toEqual([]);
        expect(getGibberishFlags({ email: 'fchomesolutions513@gmail.com', companyName: 'FC Home Solutions', website: '' })).toEqual([]);
    });

    it('reports DNS failures and private addresses as unreachable', async () => {
        const failing = async () => { throw new Error('ENOTFOUND'); };
        expect(await checkWebsite('https://nope.invalid', { lookup: failing })).toEqual({ reachable: false, reason: 'dns_failed' });
        expect((await checkWebsite('http://x.test', { lookup: async () => ({ address: '127.0.0.1' }) })).reachable).toBe(false);
        const ok = await checkWebsite('https://real.example', { lookup: async () => ({ address: '93.184.216.34' }), fetchImpl: async () => ({ status: 403 }) });
        expect(ok.reachable).toBe(true);
        expect((await checkWebsite('')).reason).toBe('no_website');
    });

    it('treats Turnstile as a no-op without keys', async () => {
        expect(await verifyTurnstile('', '1.2.3.4', { env: {} })).toBe(true);
        expect(await verifyTurnstile('', '1.2.3.4', { env: { TURNSTILE_SECRET_KEY: 'k' } })).toBe(false);
        expect(await verifyTurnstile('t', '1.2.3.4', { env: { TURNSTILE_SECRET_KEY: 'k' }, fetchImpl: async () => ({ json: async () => ({ success: true }) }) })).toBe(true);
    });

    it('stores new registrations as pending with flags and sends only a confirm email', async () => {
        const captured = {};
        const sent = [];
        const res = mockRes();
        await registerHandler({
            method: 'POST',
            headers: { 'x-forwarded-for': '198.51.100.7' },
            body: { email: 'x.y.z.q@gmail.com', company_name: 'Qkgvejtks LLC', website: 'https://vhmglbxvxu.com', form_started_at: Date.now() - 20_000 },
        }, res, {
            supabase: mockSupabase(captured),
            verifyTurnstile: async () => true,
            checkWebsite: async () => ({ reachable: false, reason: 'dns_failed' }),
            sendConfirmEmail: async (_req, email) => { sent.push(email); },
        });
        expect(res.statusCode).toBe(201);
        expect(captured.row).toMatchObject({ approved: false, status: 'pending' });
        expect(captured.row.risk_flags).toContain('website_unreachable');
        expect(sent).toEqual(['x.y.z.q@gmail.com']);
    });

    it('silently drops honeypot submissions without touching the database', async () => {
        const captured = {};
        const res = mockRes();
        await registerHandler({
            method: 'POST', headers: { 'x-forwarded-for': '198.51.100.8' },
            body: { email: 'a@b.com', company_name: 'Bot', website: '', company_fax: 'spam', form_started_at: Date.now() - 20_000 },
        }, res, { supabase: mockSupabase(captured) });
        expect(res.statusCode).toBe(201);
        expect(captured.row).toBeUndefined();
    });

    it('carries verification state and flags into the alert event', () => {
        const event = buildContractorRegistrationEvent({ email: 'a@b.com', company_name: 'A', website: '', approved: false, status: 'pending', email_verified: true, risk_flags: ['no_website'] }, { headers: {} });
        expect(event.contractor).toMatchObject({ approval_state: 'pending', email_verified: true, risk_flags: ['no_website'] });
    });
});
