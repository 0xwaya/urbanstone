import { hasReviewAdminSecret, isReviewAdminRequest } from '../../../lib/review-admin';
import { getSupabase } from '../../../lib/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = {
    approve: { approved: true, status: 'approved' },
    reject: { approved: false, status: 'rejected' },
    pending: { approved: false, status: 'pending' },
};

// Uses the same admin secret (Bearer REVIEW_INVITE_ADMIN_SECRET) as /admin/reviews.
export default async function handler(req, res, deps = {}) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (!['GET', 'POST'].includes(req.method)) {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }
    if (!hasReviewAdminSecret()) return res.status(503).json({ error: 'Admin is not configured.' });
    if (!isReviewAdminRequest(req)) return res.status(401).json({ error: 'Unauthorized.' });

    const supabase = deps.supabase || getSupabase();
    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('contractors')
            .select('id, email, company_name, website, approved, status, email_verified, risk_flags, created_at, last_login_at')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) return res.status(503).json({ error: 'Could not load contractors.' });
        return res.status(200).json({ contractors: data || [] });
    }

    const id = String(req.body?.id || '').trim();
    const change = ACTIONS[String(req.body?.action || '')];
    if (!UUID.test(id)) return res.status(400).json({ error: 'A valid id is required.' });
    if (!change) return res.status(400).json({ error: 'Unknown action.' });

    const { data, error } = await supabase
        .from('contractors')
        .update({ ...change, reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, status, approved')
        .maybeSingle();
    if (error) return res.status(503).json({ error: 'Could not update contractor.' });
    if (!data) return res.status(404).json({ error: 'Not found.' });
    if (change.status !== 'approved') {
        await supabase.from('magic_links').update({ used: true }).eq('contractor_id', id).eq('used', false);
    }
    return res.status(200).json({ contractor: data });
}
