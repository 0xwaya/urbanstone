import { hashReviewInviteToken } from '../../../lib/reviews';
import { getReviewsDb, isReviewsDbConfigured } from '../../../lib/reviews-db';

/** POST { inviteToken } -> prefill details for a valid, unused invitation. */
export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed.' });
    }
    const token = String(request.body?.inviteToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return response.status(400).json({ error: 'A valid invitation is required.' });
    if (!isReviewsDbConfigured()) return response.status(503).json({ error: 'Reviews are not configured yet.' });
    try {
        const { data, error } = await getReviewsDb().rpc('review_invite_lookup', { p_token_hash: hashReviewInviteToken(token) });
        if (error) return response.status(503).json({ error: 'Could not check your invitation. Please try again.' });
        if (!data) return response.status(404).json({ error: 'This invitation link is invalid, expired, or already used.' });
        return response.status(200).json({ invite: data });
    } catch {
        return response.status(503).json({ error: 'Could not check your invitation. Please try again.' });
    }
}
