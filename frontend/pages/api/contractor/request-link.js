import crypto from 'crypto';
import { getSupabase } from '../../../lib/supabase';
import { getEmailAccess } from '../../../lib/contractor-access';
import { getContractorEmailFrom, getContractorPortalBaseUrl, renderContractorMagicLinkEmail } from '../../../lib/contractor-portal';
import { Resend } from 'resend';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 3;
const ipTimestamps = new Map();

function checkRate(ip) {
    const now = Date.now();
    const times = (ipTimestamps.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
    times.push(now);
    ipTimestamps.set(ip, times);
    return times.length <= RATE_LIMIT;
}

export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') return res.status(405).end();

        const requestId = crypto.randomUUID();
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        if (!checkRate(ip)) return res.status(429).json({ error: 'Too many requests' });

        const { email } = req.body || {};
        if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        const emailAccess = getEmailAccess(email);
        const normalizedEmail = emailAccess.normalizedEmail;
        const supabase = getSupabase();

        const ok = () => res.status(200).json({ message: 'If your email is registered and approved, a magic link has been sent. Approved links expire in 4 hours.' });

        let { data: contractor, error: lookupError } = await supabase
            .from('contractors')
            .select('id, approved')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (lookupError) {
            console.error('[contractor/request-link] contractor lookup failed', { requestId, email: normalizedEmail, message: lookupError.message });
            return res.status(500).json({ error: 'Magic link request failed. Please try again.' });
        }

        if (emailAccess.isApproved && !contractor) {
            const { data: insertedContractor, error: insertContractorError } = await supabase
                .from('contractors')
                .insert({
                    email: normalizedEmail,
                    company_name: emailAccess.isAdmin ? 'Urban Stone Admin' : 'Vetted Contractor',
                    website: 'https://urbanstone.co',
                    approved: true,
                })
                .select('id, approved')
                .single();

            if (insertContractorError) {
                if (insertContractorError.code === '23505') {
                    const { data: existingContractor, error: refetchError } = await supabase
                        .from('contractors')
                        .select('id, approved')
                        .eq('email', normalizedEmail)
                        .maybeSingle();

                    if (refetchError) {
                        console.error('[contractor/request-link] contractor refetch failed', { requestId, email: normalizedEmail, message: refetchError.message });
                        return res.status(500).json({ error: 'Magic link request failed. Please try again.' });
                    }

                    contractor = existingContractor;
                } else {
                    console.error('[contractor/request-link] contractor insert failed', { requestId, email: normalizedEmail, message: insertContractorError.message });
                    return res.status(500).json({ error: 'Magic link request failed. Please try again.' });
                }
            } else {
                contractor = insertedContractor;
            }
        }

        const hasAccess = Boolean(contractor && (contractor.approved || emailAccess.isApproved));
        console.log('[contractor/request-link] access-check', {
            requestId,
            email: normalizedEmail,
            isAdmin: emailAccess.isAdmin,
            isApproved: emailAccess.isApproved,
            contractorId: contractor?.id || null,
            contractorApproved: contractor?.approved ?? null,
            hasAccess,
        });

        if (!contractor || !hasAccess) return ok();

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

        const { error: insertError } = await supabase.from('magic_links').insert({
            contractor_id: contractor.id,
            token_hash: tokenHash,
            expires_at: expiresAt,
            used: false,
        });

        if (insertError) {
            console.error('[contractor/request-link] magic link insert failed', { requestId, email: normalizedEmail, message: insertError.message });
            return res.status(500).json({ error: 'We could not issue your magic link. Please try again.' });
        }

        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.error('[contractor/request-link] RESEND_API_KEY missing', { requestId, email: normalizedEmail });
            await supabase.from('magic_links').delete().eq('contractor_id', contractor.id).eq('token_hash', tokenHash);
            return res.status(500).json({ error: 'Magic link email is not configured yet. Please contact sales@urbanstone.co.' });
        }

        const magicUrl = `${getContractorPortalBaseUrl(req)}/api/contractor/verify?token=${encodeURIComponent(token)}`;
        const resend = new Resend(resendKey);
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: getContractorEmailFrom(),
            to: normalizedEmail,
            subject: 'Your Urban Stone Contractor Portal Access',
            html: renderContractorMagicLinkEmail(magicUrl),
        });

        if (emailError) {
            console.error('[contractor/request-link] email send failed', {
                requestId,
                email: normalizedEmail,
                message: typeof emailError === 'string' ? emailError : JSON.stringify(emailError),
            });
            await supabase.from('magic_links').delete().eq('contractor_id', contractor.id).eq('token_hash', tokenHash);
            return res.status(502).json({ error: 'We could not send your magic link email. Please try again or contact sales@urbanstone.co.' });
        }

        console.log('[contractor/request-link] magic link sent', {
            requestId,
            email: normalizedEmail,
            emailId: emailData?.id || null,
            sender: getContractorEmailFrom(),
        });

        return ok();
    } catch (error) {
        console.error('[contractor/request-link] fatal', error);
        const message = error instanceof Error && error.message.includes('Missing Supabase server environment variables')
            ? 'Server configuration error. Add SUPABASE_PROJECT_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.'
            : 'Magic link request failed. Please try again.';
        return res.status(500).json({ error: message });
    }
}
