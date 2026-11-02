import { hasReviewAdminSecret, isReviewAdminRequest } from '../../../lib/review-admin';
import { getReviewsDb, isReviewsDbConfigured } from '../../../lib/reviews-db';
import { cleanPatch } from '../../../lib/job-board';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QUOTE = /^USC-Q-\d{4,}$/;

function adminSecret(request) {
    return /^Bearer\s+(.+)$/i.exec(String(request.headers.authorization || ''))?.[1]?.trim() || '';
}

function dbError(response, error, fallback) {
    if (error?.code === '28000') return response.status(401).json({ error: 'Unauthorized.' });
    if (error?.code === 'P0001') return response.status(409).json({ error: error.message || 'Not allowed.' });
    if (error?.code === 'P0002') return response.status(404).json({ error: 'Not found.' });
    return response.status(503).json({ error: fallback });
}

export default async function handler(request, response, deps = {}) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Robots-Tag', 'noindex');
    if (!['GET', 'POST'].includes(request.method)) {
        response.setHeader('Allow', 'GET, POST');
        return response.status(405).json({ error: 'Method not allowed.' });
    }
    if (!hasReviewAdminSecret() || !isReviewsDbConfigured()) return response.status(503).json({ error: 'Admin is not configured.' });
    if (!isReviewAdminRequest(request)) return response.status(401).json({ error: 'Unauthorized.' });

    const db = deps.db || getReviewsDb();
    const secret = adminSecret(request);

    if (request.method === 'GET') {
        const { data, error } = await db.rpc('job_admin_list', { p_secret: secret });
        if (error) return dbError(response, error, 'Could not load jobs.');
        return response.status(200).json({ jobs: data?.jobs || [], openQuotes: data?.open_quotes || [] });
    }

    const body = request.body || {};
    const action = String(body.action || '');
    if (action === 'update') {
        if (!UUID.test(String(body.id || ''))) return response.status(400).json({ error: 'A valid id is required.' });
        const { patch, error: bad } = cleanPatch(body.patch);
        if (bad) return response.status(400).json({ error: bad });
        const { data, error } = await db.rpc('job_admin_update', { p_secret: secret, p_job_id: body.id, p_patch: patch });
        if (error) return dbError(response, error, 'Could not update the job.');
        return response.status(200).json(data);
    }
    if (action === 'fee') {
        if (!UUID.test(String(body.id || ''))) return response.status(400).json({ error: 'A valid id is required.' });
        const { data, error } = await db.rpc('job_admin_fee_set', { p_secret: secret, p_fee_id: body.id, p_paid: Boolean(body.paid) });
        if (error) return dbError(response, error, 'Could not update the fee.');
        return response.status(200).json(data);
    }
    if (action === 'create') {
        const quote = String(body.quote_number || '').trim().toUpperCase();
        if (!QUOTE.test(quote)) return response.status(400).json({ error: 'A valid quote number is required.' });
        const { data, error } = await db.rpc('job_admin_create_from_quote', { p_secret: secret, p_quote_number: quote });
        if (error) return dbError(response, error, 'Could not create the job.');
        return response.status(200).json(data);
    }
    return response.status(400).json({ error: 'Unknown action.' });
}
