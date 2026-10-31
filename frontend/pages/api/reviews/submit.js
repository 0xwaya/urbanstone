import { hashReviewInviteToken, validateReviewSubmission } from '../../../lib/reviews';
import { getReviewsDb, isReviewsDbConfigured } from '../../../lib/reviews-db';
import { hasReviewAdminSecret } from '../../../lib/review-admin';
import { isAutoPublishEnabled, notifySalesReviewPublished } from '../../../lib/review-publish-notify';

const MSG_LIVE = 'Thank you! Your review is now live on urbanstone.co.';
const MSG_PENDING = 'Thank you! Your review was received and will appear on our site shortly.';

/**
 * The one-time invite token is the verification: it is only delivered to the
 * customer's email, stored as a digest, expires in 14 days and works once.
 * Invite-verified reviews auto-publish (REVIEWS_AUTO_PUBLISH, default on) through
 * the same moderation RPC + homepage revalidation as the admin Publish button.
 */
export default async function handler(request, response, deps = {}) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed.' });
    }
    const result = validateReviewSubmission(request.body);
    if (!result.ok) return response.status(400).json({ error: 'Please check the review fields.', fields: result.errors });
    if (!deps.db && !isReviewsDbConfigured()) return response.status(503).json({ error: 'Reviews are not configured yet.' });

    const db = deps.db || getReviewsDb();
    let submitted;
    try {
        const { data, error } = await db.rpc('review_submit_by_token', {
            p_token_hash: hashReviewInviteToken(result.data.inviteToken),
            p_display_name: result.data.displayName,
            p_rating: result.data.rating,
            p_review_text: result.data.reviewText,
        });
        if (error) {
            return error.code === 'P0001'
                ? response.status(409).json({ error: 'This invitation is invalid, expired, or already used.' })
                : response.status(503).json({ error: 'Could not save your review. Please try again later.' });
        }
        submitted = data || {};
    } catch {
        return response.status(503).json({ error: 'Could not save your review. Please try again later.' });
    }

    const env = deps.env || process.env;
    const adminSecret = deps.adminSecret ?? (hasReviewAdminSecret() ? process.env.REVIEW_INVITE_ADMIN_SECRET : '');
    if (!isAutoPublishEnabled(env) || !submitted.review_id || !adminSecret) {
        return response.status(201).json({ ok: true, status: 'pending', message: MSG_PENDING });
    }

    // Saved already; publishing problems leave it pending for the admin page.
    try {
        const { error } = await db.rpc('review_admin_moderate', { p_secret: adminSecret, p_review_id: submitted.review_id, p_status: 'published' });
        if (error) return response.status(201).json({ ok: true, status: 'pending', message: MSG_PENDING });
    } catch {
        return response.status(201).json({ ok: true, status: 'pending', message: MSG_PENDING });
    }

    let revalidated = true;
    if (!deps.skipRevalidate) {
        const results = await Promise.allSettled([response.revalidate('/'), response.revalidate('/es')]);
        revalidated = results.every((item) => item.status === 'fulfilled');
    }

    try {
        await (deps.notify || notifySalesReviewPublished)({
            displayName: result.data.displayName,
            rating: result.data.rating,
            reviewText: result.data.reviewText,
            jobLabel: submitted.job_label || '',
        }, { env });
    } catch {
        // The heads-up email is best effort; the review is already live.
    }

    return response.status(201).json({ ok: true, status: 'published', revalidated, message: MSG_LIVE });
}
