import crypto from 'crypto';
import { Resend } from 'resend';
import { getSupabase } from '../../../lib/supabase';
import { getEmailAccess } from '../../../lib/contractor-access';
import { getContractorEmailFrom, getContractorPortalBaseUrl } from '../../../lib/contractor-portal';
import {
    checkWebsite,
    detectBotSubmission,
    getGibberishFlags,
    renderContractorConfirmEmail,
    verifyTurnstile,
} from '../../../lib/contractor-signup';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;
const ipTimestamps = new Map();

const RECEIVED_MESSAGE = 'Application received. Check your email and click the confirmation link so we can review your request.';

function checkRate(ip) {
    const now = Date.now();
    const times = (ipTimestamps.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
    times.push(now);
    ipTimestamps.set(ip, times);
    return times.length <= RATE_LIMIT;
}

function isValidUrl(str) {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function normalizeWebsite(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function sendConfirmEmail(req, email, token) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return { skipped: true };
    const confirmUrl = `${getContractorPortalBaseUrl(req)}/api/contractor/confirm?token=${encodeURIComponent(token)}`;
    const { data, error } = await new Resend(resendKey).emails.send({
        from: getContractorEmailFrom(),
        to: email,
        subject: 'Confirm your email for Urban Stone contractor access',
        html: renderContractorConfirmEmail(confirmUrl),
    });
    if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
    return { id: data?.id || null };
}

export default async function handler(req, res, deps = {}) {
    try {
        if (req.method !== 'POST') return res.status(405).end();

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
        if (!checkRate(ip)) return res.status(429).json({ error: 'Too many requests' });

        const body = req.body || {};
        const botReason = detectBotSubmission(body);
        if (botReason) {
            console.warn('[contractor/register] dropped bot submission', { reason: botReason });
            return res.status(201).json({ message: RECEIVED_MESSAGE });
        }

        if (!(await (deps.verifyTurnstile || verifyTurnstile)(body.turnstile_token, ip))) {
            return res.status(400).json({ error: 'Verification failed. Please refresh the page and try again.' });
        }

        const { email, company_name } = body;
        const website = normalizeWebsite(body.website);

        if (!email || !company_name) {
            return res.status(400).json({ error: 'email and company_name are required' });
        }
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        if (typeof company_name !== 'string' || company_name.trim().length < 2 || company_name.length > 120) {
            return res.status(400).json({ error: 'Invalid company name' });
        }
        if (website && (!isValidUrl(website) || website.length > 512)) {
            return res.status(400).json({ error: 'Invalid website URL' });
        }

        const emailAccess = getEmailAccess(email);
        const supabase = deps.supabase || getSupabase();
        const companyName = company_name.trim();

        const siteCheck = await (deps.checkWebsite || checkWebsite)(website);
        const riskFlags = [
            ...(siteCheck.reachable === false ? ['website_unreachable'] : []),
            ...(website ? [] : ['no_website']),
            ...getGibberishFlags({ email: emailAccess.normalizedEmail, companyName, website }),
        ];

        // Pre-vetted emails (static/env allowlist) are the only automatic approvals.
        const preApproved = emailAccess.isApproved;
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const verificationExpiresAt = new Date(Date.now() + CONFIRM_TTL_MS).toISOString();

        const { data: inserted, error } = await supabase
            .from('contractors')
            .insert({
                email: emailAccess.normalizedEmail,
                company_name: companyName,
                website,
                approved: preApproved,
                status: preApproved ? 'approved' : 'pending',
                risk_flags: riskFlags,
                verification_token_hash: tokenHash,
                verification_expires_at: verificationExpiresAt,
            })
            .select('id, status, email_verified')
            .single();

        let shouldSendConfirm = Boolean(inserted);

        if (error && error.code === '23505') {
            const { data: existing, error: refetchError } = await supabase
                .from('contractors')
                .select('id, status, email_verified')
                .eq('email', emailAccess.normalizedEmail)
                .maybeSingle();
            if (refetchError || !existing) {
                console.error('[contractor/register] duplicate refetch failed', refetchError?.message || 'missing');
                return res.status(500).json({ error: 'Registration failed. Please try again.' });
            }
            if (existing.status === 'pending' && !existing.email_verified) {
                await supabase.from('contractors')
                    .update({ verification_token_hash: tokenHash, verification_expires_at: verificationExpiresAt })
                    .eq('id', existing.id);
                shouldSendConfirm = true;
            }
        } else if (error) {
            console.error('[contractor/register]', error.message);
            return res.status(500).json({ error: 'Registration failed. Please try again.' });
        }

        if (shouldSendConfirm) {
            try {
                await (deps.sendConfirmEmail || sendConfirmEmail)(req, emailAccess.normalizedEmail, token);
            } catch (sendError) {
                console.error('[contractor/register] confirm email failed', sendError instanceof Error ? sendError.message : String(sendError));
                return res.status(502).json({ error: 'We could not send your confirmation email. Please try again or contact sales@urbanstone.co.' });
            }
        }

        return res.status(201).json({ message: RECEIVED_MESSAGE });
    } catch (error) {
        console.error('[contractor/register] fatal', error);
        const message = error instanceof Error && error.message.includes('Missing Supabase server environment variables')
            ? 'Server configuration error. Add SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.'
            : 'Registration failed. Please try again.';
        return res.status(500).json({ error: message });
    }
}
