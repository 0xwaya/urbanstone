import { hashReviewInviteToken, validateReviewSubmission } from '../../../lib/reviews';
import { getReviewsDb, isReviewsDbConfigured } from '../../../lib/reviews-db';

/**
 * The one-time invite token is the verification: it is only delivered to the
 * customer's email, stored as a digest, expires in 14 days and works once.
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

    try {
        const { error } = await (deps.db || getReviewsDb()).rpc('review_submit_by_token', {
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
        return response.status(201).json({ ok: true, message: 'Thank you! Your review was received and will appear on our site once it is approved.' });
    } catch {
        return response.status(503).json({ error: 'Could not save your review. Please try again later.' });
    }
}
