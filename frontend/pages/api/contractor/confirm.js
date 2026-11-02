import crypto from 'crypto';
import { getSupabase } from '../../../lib/supabase';
import {
    buildContractorRegistrationEvent,
    relayContractorRegistrationEvent,
    sendContractorRegistrationNotification,
} from '../../../lib/contractor-notifications';

function page(res, status, message) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).send(`<!doctype html><html><head><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Urban Stone Contractor Program</title></head><body style="font-family:sans-serif;max-width:520px;margin:64px auto;padding:0 24px;"><h2 style="color:#4a90e2;">Urban Stone</h2><p>${message}</p><p><a href="/contractors/login">Back to the contractor page</a></p></body></html>`);
}

export default async function handler(req, res, deps = {}) {
    if (req.method !== 'GET') return res.status(405).end();
    const { token } = req.query;
    if (!token || typeof token !== 'string' || token.length > 256) return page(res, 400, 'This confirmation link is invalid.');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const supabase = deps.supabase || getSupabase();
    const { data: contractor, error } = await supabase
        .from('contractors')
        .select('id, email, company_name, website, approved, status, email_verified, risk_flags, verification_expires_at, created_at')
        .eq('verification_token_hash', tokenHash)
        .maybeSingle();

    if (error || !contractor) return page(res, 400, 'This confirmation link is invalid or was already used.');
    if (contractor.verification_expires_at && new Date(contractor.verification_expires_at) < new Date()) {
        return page(res, 400, 'This confirmation link has expired. Please submit the request form again.');
    }

    const verifiedAt = new Date().toISOString();
    await supabase.from('contractors')
        .update({ email_verified: true, email_verified_at: verifiedAt, verification_token_hash: null, verification_expires_at: null })
        .eq('id', contractor.id);

    if (contractor.status !== 'rejected') {
        const event = buildContractorRegistrationEvent({ ...contractor, email_verified: true }, req);
        const jobs = [(deps.notify || sendContractorRegistrationNotification)(event)];
        const webhookUrl = process.env.CONTRACTOR_REGISTRATION_WEBHOOK_URL;
        if (webhookUrl) jobs.push(relayContractorRegistrationEvent(event, webhookUrl));
        const results = await Promise.allSettled(jobs);
        results.forEach((result) => {
            if (result.status === 'rejected') {
                console.error('[contractor/confirm] notification failed', result.reason instanceof Error ? result.reason.message : String(result.reason));
            }
        });
    }

    return page(res, 200, contractor.approved
        ? 'Thanks, your email is confirmed. You can request your portal access link now.'
        : 'Thanks, your email is confirmed. Our team will review your application and email you once it is approved.');
}
