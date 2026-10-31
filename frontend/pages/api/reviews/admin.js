import {
    createReviewInviteToken,
    hashReviewInviteEmail,
    hashReviewInviteToken,
    REVIEW_INVITE_TTL_DAYS,
} from '../../../lib/reviews';
import { hasReviewAdminSecret, isReviewAdminRequest } from '../../../lib/review-admin';
import { getReviewsDb, isReviewsDbConfigured } from '../../../lib/reviews-db';
import { buildReviewInviteEmail, REVIEW_EMAIL_FROM, sendReviewInviteEmail } from '../../../lib/review-invite-email';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getInviteOrigin(env = process.env) {
    if (env.VERCEL_ENV === 'preview' && env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
    try {
        const url = new URL(String(env.NEXT_PUBLIC_SITE_URL || '').trim());
        if (url.protocol === 'https:' || (env.NODE_ENV !== 'production' && url.hostname === 'localhost')) return url.origin;
    } catch {
        // fall through
    }
    return 'https://www.urbanstone.co';
}

export function canSendWithResend(env = process.env) {
    return Boolean(String(env.RESEND_API_KEY || '').trim()) && env.REVIEW_INVITE_DELIVERY !== 'manual';
}

function adminSecret(request) {
    return /^Bearer\s+(.+)$/i.exec(String(request.headers.authorization || ''))?.[1]?.trim() || '';
}

function dbError(response, error, fallback) {
    const message = String(error?.message || '');
    if (error?.code === '28000') return response.status(401).json({ error: 'Unauthorized.' });
    if (error?.code === 'P0001') return response.status(409).json({ error: message || 'Not allowed in the current state.' });
    if (error?.code === 'P0002') return response.status(404).json({ error: 'Not found.' });
    if (error?.code === 'P0003') return response.status(422).json({ error: 'This customer has no email address in the CRM.' });
    return response.status(503).json({ error: fallback });
}

async function revalidateHome(response) {
    const results = await Promise.allSettled([response.revalidate('/'), response.revalidate('/es')]);
    return results.every((result) => result.status === 'fulfilled');
}

export default async function handler(request, response, deps = {}) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Robots-Tag', 'noindex');

    if (!['GET', 'POST'].includes(request.method)) {
        response.setHeader('Allow', 'GET, POST');
        return response.status(405).json({ error: 'Method not allowed.' });
    }
    if (!hasReviewAdminSecret() || !isReviewsDbConfigured()) {
        return response.status(503).json({ error: 'Review admin is not configured.' });
    }
    if (!isReviewAdminRequest(request)) return response.status(401).json({ error: 'Unauthorized.' });

    const db = deps.db || getReviewsDb();
    const secret = adminSecret(request);
    const delivery = canSendWithResend() ? 'resend' : 'manual';

    if (request.method === 'GET') {
        const { data, error } = await db.rpc('review_admin_list', { p_secret: secret });
        if (error) return dbError(response, error, 'Could not load review requests.');
        const requests = (data?.requests || []).map((item) => ({
            ...item,
            preview: buildReviewInviteEmail({
                customerName: item.customer_name,
                jobLabel: item.job_label,
                inviteUrl: `${getInviteOrigin()}/reviews/invite#invite=<personal link created when you approve>`,
            }),
        }));
        return response.status(200).json({ delivery, requests, reviews: data?.reviews || [] });
    }

    const action = String(request.body?.action || '');
    const id = String(request.body?.id || '').trim();
    if (!UUID.test(id)) return response.status(400).json({ error: 'A valid id is required.' });

    if (action === 'approve_send') {
        const hmacKey = process.env.REVIEW_INVITE_EMAIL_HMAC_KEY;
        if (!hmacKey) return response.status(503).json({ error: 'Review invitations are not configured.' });

        const { data: listData, error: listError } = await db.rpc('review_admin_list', { p_secret: secret });
        if (listError) return dbError(response, listError, 'Could not load the request.');
        const target = (listData?.requests || []).find((item) => item.id === id);
        if (!target) return response.status(404).json({ error: 'Not found.' });
        if (!['eligible', 'approved'].includes(target.status)) {
            return response.status(409).json({ error: `Already ${target.status}; nothing was sent.` });
        }

        let emailHash;
        try {
            emailHash = hashReviewInviteEmail(target.customer_email, hmacKey);
        } catch {
            return response.status(422).json({ error: 'This customer has no valid email address in the CRM.' });
        }
        const token = createReviewInviteToken();
        const expiresAt = new Date(Date.now() + REVIEW_INVITE_TTL_DAYS * 86400000).toISOString();
        const { data: issued, error: issueError } = await db.rpc('review_admin_issue_invite', {
            p_secret: secret,
            p_request_id: id,
            p_token_hash: hashReviewInviteToken(token),
            p_email_hash: emailHash,
            p_expires_at: expiresAt,
        });
        if (issueError) return dbError(response, issueError, 'Could not create the invitation.');

        const inviteUrl = `${getInviteOrigin()}/reviews/invite#invite=${encodeURIComponent(token)}`;
        const email = buildReviewInviteEmail({ customerName: issued.customer_name, jobLabel: issued.job_label, inviteUrl });

        if (delivery === 'manual') {
            return response.status(200).json({
                status: 'approved', delivery, to: issued.customer_email, inviteUrl, expiresAt, email,
                next: 'Send this email yourself from sales@, then click "Mark as sent".',
            });
        }

        try {
            const messageId = await (deps.sendEmail || sendReviewInviteEmail)({ to: issued.customer_email, email });
            const { error: markError } = await db.rpc('review_admin_mark_sent', {
                p_secret: secret, p_request_id: id, p_via: 'resend', p_subject: email.subject,
                p_from: REVIEW_EMAIL_FROM, p_note: messageId ? `resend id ${messageId}` : '',
            });
            if (markError) return response.status(200).json({ status: 'sent', delivery, warning: 'Sent, but the CRM log failed. Do not resend.' });
            return response.status(200).json({ status: 'sent', delivery, to: issued.customer_email, email });
        } catch {
            return response.status(502).json({
                status: 'approved', error: 'Email provider rejected the message; nothing was sent. You can retry or send manually.',
                inviteUrl, email,
            });
        }
    }

    if (action === 'mark_sent') {
        const { data, error } = await db.rpc('review_admin_mark_sent', {
            p_secret: secret, p_request_id: id, p_via: 'manual',
            p_subject: String(request.body?.subject || 'Review invitation').slice(0, 300),
            p_from: 'sales@urbanstone.co', p_note: 'sent manually from sales@',
        });
        if (error) return dbError(response, error, 'Could not mark as sent.');
        return response.status(200).json(data);
    }

    if (action === 'decline') {
        const { data, error } = await db.rpc('review_admin_decline', { p_secret: secret, p_request_id: id });
        if (error) return dbError(response, error, 'Could not decline.');
        return response.status(200).json(data);
    }

    if (action === 'publish' || action === 'reject') {
        const { data, error } = await db.rpc('review_admin_moderate', {
            p_secret: secret, p_review_id: id, p_status: action === 'publish' ? 'published' : 'rejected',
        });
        if (error) return dbError(response, error, 'Could not update the review.');
        const revalidated = deps.skipRevalidate ? true : await revalidateHome(response);
        return response.status(200).json({ ...data, revalidated });
    }

    return response.status(400).json({ error: 'Unknown action.' });
}
