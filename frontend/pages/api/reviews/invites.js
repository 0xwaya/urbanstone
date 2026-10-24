import {
    createReviewInviteToken,
    hashReviewInviteEmail,
    hashReviewInviteToken,
    normalizeReviewEmail,
    REVIEW_INVITE_TTL_DAYS,
} from '../../../lib/reviews';
import { hasReviewAdminSecret, isReviewAdminRequest } from '../../../lib/review-admin';
import { getSupabase } from '../../../lib/supabase';

function getSiteOrigin() {
    const configured = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!configured) return '';

    try {
        const url = new URL(configured);
        const localHttp = process.env.NODE_ENV !== 'production'
            && url.protocol === 'http:'
            && ['localhost', '127.0.0.1'].includes(url.hostname);
        if ((!localHttp && url.protocol !== 'https:') || url.username || url.password) return '';
        return url.origin;
    } catch {
        return '';
    }
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed.' });
    }

    if (!hasReviewAdminSecret() || !process.env.REVIEW_INVITE_EMAIL_HMAC_KEY) {
        return response.status(503).json({ error: 'Review invitations are not configured.' });
    }
    if (!isReviewAdminRequest(request)) {
        return response.status(401).json({ error: 'Unauthorized.' });
    }

    const siteOrigin = getSiteOrigin();
    if (!siteOrigin) {
        return response.status(503).json({ error: 'NEXT_PUBLIC_SITE_URL must be set to the canonical HTTPS site origin.' });
    }

    const email = normalizeReviewEmail(request.body?.email);
    const customerReference = String(request.body?.customerReference || '').trim();
    if (!email || !/^[A-Za-z0-9._:-]{1,128}$/.test(customerReference)) {
        return response.status(400).json({
            error: 'Valid customer email and a non-sensitive customer/order reference are required.',
        });
    }

    let eligibleEmailHash;
    try {
        eligibleEmailHash = hashReviewInviteEmail(email, process.env.REVIEW_INVITE_EMAIL_HMAC_KEY);
    } catch {
        return response.status(503).json({ error: 'Review invitations are not configured.' });
    }

    const token = createReviewInviteToken();
    const expiresAt = new Date(Date.now() + REVIEW_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    try {
        const { error } = await getSupabase().rpc('create_review_invite', {
            p_token_hash: hashReviewInviteToken(token),
            p_eligible_email_hash: eligibleEmailHash,
            p_customer_reference: customerReference,
            p_expires_at: expiresAt,
        });

        if (error) {
            const status = error.code === 'P0001' ? 409 : 503;
            return response.status(status).json({
                error: status === 409
                    ? 'A review has already been submitted for this customer reference.'
                    : 'Could not create the invitation. Confirm the review migration is installed.',
            });
        }

        return response.status(201).json({
            inviteUrl: `${siteOrigin}/reviews/invite#invite=${encodeURIComponent(token)}`,
            expiresAt,
            expiresInDays: REVIEW_INVITE_TTL_DAYS,
            delivery: 'manual',
        });
    } catch {
        return response.status(503).json({ error: 'Could not create the invitation. Confirm Supabase review configuration.' });
    }
}
