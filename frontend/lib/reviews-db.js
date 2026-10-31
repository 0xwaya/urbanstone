/**
 * Server-only client for the review RPCs. Every review read/write goes through
 * SECURITY DEFINER functions gated by the invite-token digest (public) or the
 * admin secret (admin), so the public publishable key is enough. Prefers the
 * dedicated REVIEWS_SUPABASE_* vars and falls back to the CRM service client.
 */
import { createClient } from '@supabase/supabase-js';

let client;

export function isReviewsDbConfigured(env = process.env) {
    return Boolean((env.REVIEWS_SUPABASE_URL && env.REVIEWS_SUPABASE_PUBLISHABLE_KEY)
        || ((env.SUPABASE_URL || env.SUPABASE_PROJECT_URL) && env.SUPABASE_SERVICE_ROLE_KEY));
}

export function getReviewsDb(env = process.env) {
    if (client) return client;
    const url = env.REVIEWS_SUPABASE_URL || env.SUPABASE_URL || env.SUPABASE_PROJECT_URL;
    const key = env.REVIEWS_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Review database is not configured.');
    client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    return client;
}

/** Published reviews for the homepage. Never throws; returns [] on any problem. */
export async function fetchPublishedReviews({ db, timeoutMs = 4000 } = {}) {
    if (!db && !isReviewsDbConfigured()) return [];
    try {
        const query = (db || getReviewsDb()).rpc('reviews_published');
        const timeout = new Promise((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), timeoutMs));
        const { data, error } = await Promise.race([query, timeout]);
        if (error || !Array.isArray(data)) return [];
        return data.map((row) => ({
            id: String(row.id),
            display_name: String(row.display_name || ''),
            rating: Number(row.rating) || 0,
            review_text: String(row.review_text || ''),
            job_label: row.job_label || null,
            location: row.location || null,
            published_at: row.published_at || null,
        }));
    } catch {
        return [];
    }
}

/** Shared homepage getStaticProps: rebuilt on demand when a review is published. */
export async function getReviewStaticProps() {
    return { props: { reviews: await fetchPublishedReviews() }, revalidate: 3600 };
}
