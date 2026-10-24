import { hasReviewAdminSecret, isReviewAdminRequest } from '../../../lib/review-admin';
import { getSupabase } from '../../../lib/supabase';

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    if (!['GET', 'PATCH'].includes(request.method)) {
        response.setHeader('Allow', 'GET, PATCH');
        return response.status(405).json({ error: 'Method not allowed.' });
    }
    if (!hasReviewAdminSecret()) {
        return response.status(503).json({ error: 'Review moderation is not configured.' });
    }
    if (!isReviewAdminRequest(request)) {
        return response.status(401).json({ error: 'Unauthorized.' });
    }

    try {
        const supabase = getSupabase();
        if (request.method === 'GET') {
            const { data, error } = await supabase
                .from('customer_reviews')
                .select('id, customer_reference, display_name, rating, review_text, submitted_at')
                .eq('status', 'pending')
                .order('submitted_at', { ascending: true })
                .limit(100);
            if (error) return response.status(503).json({ error: 'Could not load pending reviews.' });
            return response.status(200).json({ reviews: data || [] });
        }

        const id = String(request.body?.id || '').trim();
        const status = String(request.body?.status || '').trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
            || !['published', 'rejected'].includes(status)) {
            return response.status(400).json({ error: 'A valid review id and published/rejected decision are required.' });
        }

        const { data, error } = await supabase
            .from('customer_reviews')
            .update({ status, published_at: status === 'published' ? new Date().toISOString() : null })
            .eq('id', id)
            .eq('status', 'pending')
            .select('id, status')
            .maybeSingle();

        if (error) return response.status(503).json({ error: 'Could not update review status.' });
        if (!data) return response.status(404).json({ error: 'Pending review not found.' });
        return response.status(200).json({ review: data });
    } catch {
        return response.status(503).json({
            error: request.method === 'GET' ? 'Could not load pending reviews.' : 'Could not update review status.',
        });
    }
}
