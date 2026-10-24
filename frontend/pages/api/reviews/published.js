import { getSupabase } from '../../../lib/supabase';

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const { data, error } = await getSupabase()
            .from('customer_reviews')
            .select('id, display_name, rating, review_text, submitted_at')
            .eq('status', 'published')
            .order('submitted_at', { ascending: false })
            .limit(30);

        if (error) return response.status(503).json({ error: 'Reviews are temporarily unavailable.' });
        return response.status(200).json({ reviews: data || [] });
    } catch {
        return response.status(503).json({ error: 'Reviews are temporarily unavailable.' });
    }
}
