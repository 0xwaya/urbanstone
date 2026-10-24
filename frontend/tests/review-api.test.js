import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabase } from '../lib/supabase';
import {
    createReviewInviteToken,
    hashReviewInviteEmail,
    hashReviewInviteToken,
} from '../lib/reviews';
import createInviteHandler from '../pages/api/reviews/invites';
import moderateReviewsHandler from '../pages/api/reviews/moderate';
import publishedReviewsHandler from '../pages/api/reviews/published';
import submitReviewHandler from '../pages/api/reviews/submit';

vi.mock('../lib/supabase', () => ({ getSupabase: vi.fn() }));

const ADMIN_SECRET = 'test-only-admin-secret-that-is-longer-than-32-bytes';
const EMAIL_HMAC_KEY = 'test-only-email-hmac-key-that-is-longer-than-32-bytes';

function makeResponse() {
    return {
        headers: {},
        statusCode: 200,
        body: undefined,
        setHeader(name, value) { this.headers[name] = value; return this; },
        status(code) { this.statusCode = code; return this; },
        json(value) { this.body = value; return this; },
    };
}

function setInviteConfig() {
    vi.stubEnv('REVIEW_INVITE_ADMIN_SECRET', ADMIN_SECRET);
    vi.stubEnv('REVIEW_INVITE_EMAIL_HMAC_KEY', EMAIL_HMAC_KEY);
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.urbanstone.co');
    vi.stubEnv('NODE_ENV', 'production');
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
});

describe('review invitation issuance', () => {
    it('issues a manual, expiring link while persisting only token/email digests', async () => {
        setInviteConfig();
        const rpc = vi.fn().mockResolvedValue({ data: 'invite-id', error: null });
        getSupabase.mockReturnValue({ rpc });
        const request = {
            method: 'POST',
            headers: { authorization: `Bearer ${ADMIN_SECRET}` },
            body: { email: 'Previous.Customer@example.com', customerReference: 'JOB-2042' },
        };
        const response = makeResponse();

        await createInviteHandler(request, response);

        expect(response.statusCode).toBe(201);
        expect(response.body.delivery).toBe('manual');
        expect(response.body.expiresInDays).toBe(14);
        expect(response.body.inviteUrl).toMatch(/^https:\/\/www\.urbanstone\.co\/reviews\/invite#invite=/);
        const token = decodeURIComponent(response.body.inviteUrl.split('#invite=')[1]);
        expect(rpc).toHaveBeenCalledWith('create_review_invite', {
            p_token_hash: hashReviewInviteToken(token),
            p_eligible_email_hash: hashReviewInviteEmail('previous.customer@example.com', EMAIL_HMAC_KEY),
            p_customer_reference: 'JOB-2042',
            p_expires_at: expect.any(String),
        });
        expect(JSON.stringify(rpc.mock.calls)).not.toContain('previous.customer@example.com');
    });

    it('does not issue an invitation without the private admin secret', async () => {
        setInviteConfig();
        const response = makeResponse();
        await createInviteHandler({
            method: 'POST',
            headers: { authorization: 'Bearer wrong-secret' },
            body: { email: 'customer@example.com', customerReference: 'JOB-2043' },
        }, response);

        expect(response.statusCode).toBe(401);
        expect(getSupabase).not.toHaveBeenCalled();
    });
});

describe('invite-only review submission', () => {
    it('requires a verified Google identity and submits only hashed identity/invite values', async () => {
        vi.stubEnv('REVIEW_INVITE_EMAIL_HMAC_KEY', EMAIL_HMAC_KEY);
        const token = createReviewInviteToken();
        const rpc = vi.fn().mockResolvedValue({ data: [{ review_id: 'review-id', review_status: 'pending' }], error: null });
        const user = {
            email: 'Customer@example.com',
            email_confirmed_at: '2026-10-17T20:00:00.000Z',
            app_metadata: { provider: 'google', providers: ['google'] },
        };
        getSupabase.mockReturnValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
            rpc,
        });
        const response = makeResponse();

        await submitReviewHandler({
            method: 'POST',
            headers: { authorization: 'Bearer supabase-access-token' },
            body: {
                inviteToken: token,
                displayName: 'Customer',
                rating: 4,
                reviewText: 'The crew was careful and the finished counters look excellent.',
            },
        }, response);

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toMatch(/not posted to Google/i);
        expect(rpc).toHaveBeenCalledWith('submit_invited_review', {
            p_token_hash: hashReviewInviteToken(token),
            p_eligible_email_hash: hashReviewInviteEmail('customer@example.com', EMAIL_HMAC_KEY),
            p_display_name: 'Customer',
            p_rating: 4,
            p_review_text: 'The crew was careful and the finished counters look excellent.',
        });
        expect(JSON.stringify(rpc.mock.calls)).not.toContain('Customer@example.com');
        expect(JSON.stringify(rpc.mock.calls)).not.toContain(token);
    });

    it('rejects non-Google identities before calling the database', async () => {
        vi.stubEnv('REVIEW_INVITE_EMAIL_HMAC_KEY', EMAIL_HMAC_KEY);
        getSupabase.mockReturnValue({
            auth: { getUser: vi.fn().mockResolvedValue({
                data: { user: { email: 'customer@example.com', email_confirmed_at: 'now', app_metadata: { provider: 'email' } } },
                error: null,
            }) },
            rpc: vi.fn(),
        });
        const response = makeResponse();

        await submitReviewHandler({
            method: 'POST',
            headers: { authorization: 'Bearer access-token' },
            body: {
                inviteToken: createReviewInviteToken(),
                displayName: 'Customer',
                rating: 5,
                reviewText: 'A sufficiently long review describing the project and service.',
            },
        }, response);

        expect(response.statusCode).toBe(401);
        expect(getSupabase.mock.results[0].value.rpc).not.toHaveBeenCalled();
    });
});

describe('public review wall', () => {
    it('queries and returns published fields only', async () => {
        const data = [{
            id: 'review-id',
            display_name: 'Jordan',
            rating: 5,
            review_text: 'The crew was professional and the new counters look wonderful.',
            submitted_at: '2026-10-17T20:00:00.000Z',
        }];
        const query = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data, error: null }),
        };
        getSupabase.mockReturnValue({ from: vi.fn().mockReturnValue(query) });
        const response = makeResponse();

        await publishedReviewsHandler({ method: 'GET', headers: {} }, response);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ reviews: data });
        expect(query.select).toHaveBeenCalledWith('id, display_name, rating, review_text, submitted_at');
        expect(query.eq).toHaveBeenCalledWith('status', 'published');
        expect(query.limit).toHaveBeenCalledWith(30);
    });
});

describe('admin review moderation', () => {
    it('only publishes a pending review after an explicit admin decision', async () => {
        vi.stubEnv('REVIEW_INVITE_ADMIN_SECRET', ADMIN_SECRET);
        const pendingQuery = {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: { id: '123e4567-e89b-42d3-a456-426614174000', status: 'published' },
                error: null,
            }),
        };
        getSupabase.mockReturnValue({ from: vi.fn().mockReturnValue(pendingQuery) });
        const response = makeResponse();

        await moderateReviewsHandler({
            method: 'PATCH',
            headers: { authorization: `Bearer ${ADMIN_SECRET}` },
            body: { id: '123e4567-e89b-42d3-a456-426614174000', status: 'published' },
        }, response);

        expect(response.statusCode).toBe(200);
        expect(pendingQuery.update).toHaveBeenCalledWith({ status: 'published', published_at: expect.any(String) });
        expect(pendingQuery.eq).toHaveBeenNthCalledWith(1, 'id', '123e4567-e89b-42d3-a456-426614174000');
        expect(pendingQuery.eq).toHaveBeenNthCalledWith(2, 'status', 'pending');
    });
});
