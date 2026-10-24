import {
    getBearerToken,
    hashReviewInviteEmail,
    hashReviewInviteToken,
    validateReviewSubmission,
} from '../../../lib/reviews';
import { getSupabase } from '../../../lib/supabase';

function isGoogleVerifiedUser(user) {
    const providers = new Set([
        user?.app_metadata?.provider,
        ...(Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : []),
        ...(Array.isArray(user?.identities) ? user.identities.map((identity) => identity?.provider) : []),
    ].filter(Boolean));
    return providers.has('google') && Boolean(user?.email && user?.email_confirmed_at);
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed.' });
    }

    const authorizationToken = getBearerToken(request.headers.authorization);
    if (!authorizationToken || authorizationToken.length > 4096) {
        return response.status(401).json({ error: 'Sign in with the Google account named in your invitation.' });
    }

    const result = validateReviewSubmission(request.body);
    if (!result.ok) {
        return response.status(400).json({ error: 'Please check the review fields.', fields: result.errors });
    }

    if (!process.env.REVIEW_INVITE_EMAIL_HMAC_KEY) {
        return response.status(503).json({ error: 'Review submissions are not configured.' });
    }

    try {
        const supabase = getSupabase();
        const { data: authData, error: authError } = await supabase.auth.getUser(authorizationToken);
        const user = authData?.user;
        if (authError || !isGoogleVerifiedUser(user)) {
            return response.status(401).json({ error: 'Sign in with the verified Google account named in your invitation.' });
        }

        const eligibleEmailHash = hashReviewInviteEmail(user.email, process.env.REVIEW_INVITE_EMAIL_HMAC_KEY);
        const { data, error } = await supabase.rpc('submit_invited_review', {
            p_token_hash: hashReviewInviteToken(result.data.inviteToken),
            p_eligible_email_hash: eligibleEmailHash,
            p_display_name: result.data.displayName,
            p_rating: result.data.rating,
            p_review_text: result.data.reviewText,
        });

        if (error) {
            const status = error.code === 'P0001' ? 409 : 503;
            return response.status(status).json({
                error: status === 409
                    ? 'This invitation is invalid, expired, already used, or does not match this Google account.'
                    : 'Could not save your review. Please try again later.',
            });
        }

        if (!Array.isArray(data) || data.length !== 1 || data[0]?.review_status !== 'pending') {
            return response.status(503).json({ error: 'Could not confirm the review submission.' });
        }

        return response.status(201).json({
            ok: true,
            message: 'Thank you. Your review is saved for Urban Stone moderation; it is not posted to Google.',
        });
    } catch {
        return response.status(503).json({ error: 'Could not save your review. Please try again later.' });
    }
}
