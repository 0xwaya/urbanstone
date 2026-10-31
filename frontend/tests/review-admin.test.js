import handler, { canSendWithResend, getInviteOrigin } from '../pages/api/reviews/admin';
import submitHandler from '../pages/api/reviews/submit';
import { buildReviewInviteEmail, sendReviewInviteEmail } from '../lib/review-invite-email';

const SECRET = 'a'.repeat(40);

function mockResponse() {
    const res = { headers: {}, statusCode: 200, body: null };
    res.setHeader = (k, v) => { res.headers[k] = v; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    res.revalidate = vi.fn().mockResolvedValue(undefined);
    return res;
}

const request = { id: '11111111-1111-4111-8111-111111111111', status: 'eligible', customer_name: 'Pat Example', customer_email: 'pat@example.com', job_label: 'Kitchen countertops' };

function mockDb(overrides = {}) {
    return {
        rpc: vi.fn(async (name) => {
            if (overrides[name]) return overrides[name]();
            if (name === 'review_admin_list') return { data: { requests: [request], reviews: [] }, error: null };
            if (name === 'review_admin_issue_invite') return { data: { customer_name: 'Pat Example', customer_email: 'pat@example.com', job_label: 'Kitchen countertops' }, error: null };
            if (name === 'review_admin_mark_sent') return { data: { status: 'sent' }, error: null };
            if (name === 'review_admin_moderate') return { data: { status: 'published' }, error: null };
            return { data: null, error: null };
        }),
    };
}

describe('review invite email', () => {
    it('is warm, signed, has the link, and adds Google only when configured', () => {
        const email = buildReviewInviteEmail({ customerName: 'Pat Example', jobLabel: 'Kitchen countertops', inviteUrl: 'https://x.test/i', googleReviewUrl: '' });
        expect(email.text).toMatch(/^Hi Pat,/);
        expect(email.text).toContain('https://x.test/i');
        expect(email.text).toContain('Edward Mercado\nUrban Stone Collective\n(513) 307-5840\nsales@urbanstone.co\nurbanstone.co');
        expect(email.text).not.toMatch(/google\.com/);
        const withGoogle = buildReviewInviteEmail({ customerName: 'Pat', inviteUrl: 'https://x.test/i', googleReviewUrl: 'https://g.page/r/abc/review' });
        expect(withGoogle.text).toContain('https://g.page/r/abc/review');
    });

    it('sends only through the injected fetch (no real email in tests)', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'msg_1' }) });
        const email = buildReviewInviteEmail({ customerName: 'Pat', inviteUrl: 'https://x.test/i' });
        await expect(sendReviewInviteEmail({ to: 'pat@example.com', email, env: { RESEND_API_KEY: 'test' }, fetchImpl })).resolves.toBe('msg_1');
        expect(JSON.parse(fetchImpl.mock.calls[0][1].body).from).toBe('Edward Mercado <sales@urbanstone.co>');
    });
});

describe('/api/reviews/admin', () => {
    beforeEach(() => {
        vi.stubEnv('REVIEW_INVITE_ADMIN_SECRET', SECRET);
        vi.stubEnv('REVIEW_INVITE_EMAIL_HMAC_KEY', 'b'.repeat(40));
        vi.stubEnv('REVIEWS_SUPABASE_URL', 'https://db.test');
        vi.stubEnv('REVIEWS_SUPABASE_PUBLISHABLE_KEY', 'pk');
        vi.stubEnv('RESEND_API_KEY', '');
    });
    afterEach(() => vi.unstubAllEnvs());

    it('rejects requests without the admin secret', async () => {
        const res = mockResponse();
        await handler({ method: 'GET', headers: {} }, res, { db: mockDb() });
        expect(res.statusCode).toBe(401);
    });

    it('lists requests with an email preview', async () => {
        const res = mockResponse();
        await handler({ method: 'GET', headers: { authorization: `Bearer ${SECRET}` } }, res, { db: mockDb() });
        expect(res.statusCode).toBe(200);
        expect(res.body.delivery).toBe('manual');
        expect(res.body.requests[0].preview.text).toMatch(/Hi Pat/);
    });

    it('in manual mode creates the link and returns the email without sending', async () => {
        const sendEmail = vi.fn();
        const db = mockDb();
        const res = mockResponse();
        await handler({ method: 'POST', headers: { authorization: `Bearer ${SECRET}` }, body: { action: 'approve_send', id: request.id } }, res, { db, sendEmail });
        expect(res.statusCode).toBe(200);
        expect(res.body.delivery).toBe('manual');
        expect(res.body.inviteUrl).toMatch(/\/reviews\/invite#invite=/);
        expect(sendEmail).not.toHaveBeenCalled();
        expect(db.rpc.mock.calls.map((c) => c[0])).not.toContain('review_admin_mark_sent');
    });

    it('with Resend sends once via the injected sender and logs it', async () => {
        vi.stubEnv('RESEND_API_KEY', 'test-key');
        const sendEmail = vi.fn().mockResolvedValue('msg_1');
        const db = mockDb();
        const res = mockResponse();
        await handler({ method: 'POST', headers: { authorization: `Bearer ${SECRET}` }, body: { action: 'approve_send', id: request.id } }, res, { db, sendEmail });
        expect(res.body.status).toBe('sent');
        expect(sendEmail).toHaveBeenCalledTimes(1);
        expect(db.rpc.mock.calls.map((c) => c[0])).toContain('review_admin_mark_sent');
    });

    it('never re-sends an already sent request', async () => {
        const sendEmail = vi.fn();
        const db = mockDb({ review_admin_list: () => ({ data: { requests: [{ ...request, status: 'sent' }] }, error: null }) });
        const res = mockResponse();
        await handler({ method: 'POST', headers: { authorization: `Bearer ${SECRET}` }, body: { action: 'approve_send', id: request.id } }, res, { db, sendEmail });
        expect(res.statusCode).toBe(409);
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it('publishing revalidates the EN and ES homepages', async () => {
        const res = mockResponse();
        await handler({ method: 'POST', headers: { authorization: `Bearer ${SECRET}` }, body: { action: 'publish', id: request.id } }, res, { db: mockDb() });
        expect(res.revalidate).toHaveBeenCalledWith('/');
        expect(res.revalidate).toHaveBeenCalledWith('/es');
    });

    it('uses the preview origin on preview deployments and manual mode when flagged', () => {
        expect(getInviteOrigin({ VERCEL_ENV: 'preview', VERCEL_URL: 'abc.vercel.app' })).toBe('https://abc.vercel.app');
        expect(getInviteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://www.urbanstone.co' })).toBe('https://www.urbanstone.co');
        expect(canSendWithResend({ RESEND_API_KEY: 'k', REVIEW_INVITE_DELIVERY: 'manual' })).toBe(false);
    });
});

describe('/api/reviews/submit', () => {
    it('saves a token-verified review without Google sign-in', async () => {
        const db = { rpc: vi.fn().mockResolvedValue({ data: { status: 'pending' }, error: null }) };
        const res = mockResponse();
        await submitHandler({ method: 'POST', headers: {}, body: { inviteToken: 'x'.repeat(43), displayName: 'Pat E.', rating: 5, reviewText: 'Great work from start to finish, thank you!' } }, res, { db });
        expect(res.statusCode).toBe(201);
        expect(db.rpc).toHaveBeenCalledWith('review_submit_by_token', expect.objectContaining({ p_rating: 5 }));
    });

    it('rejects used or expired invitations', async () => {
        const db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: 'P0001' } }) };
        const res = mockResponse();
        await submitHandler({ method: 'POST', headers: {}, body: { inviteToken: 'x'.repeat(43), displayName: 'Pat', rating: 4, reviewText: 'Great work from start to finish, thank you!' } }, res, { db });
        expect(res.statusCode).toBe(409);
    });
});
