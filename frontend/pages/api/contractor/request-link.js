import crypto from 'crypto';
import { getSupabase } from '../../../lib/supabase';
import { getEmailAccess } from '../../../lib/contractor-access';
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
    if (req.method !== 'POST') return res.status(405).end();

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRate(ip)) return res.status(429).json({ error: 'Too many requests' });

    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    const emailAccess = getEmailAccess(email);
    const normalizedEmail = emailAccess.normalizedEmail;
    const supabase = getSupabase();

    // Look up contractor
    let { data: contractor, error: lookupError } = await supabase
        .from('contractors')
        .select('id, approved')
        .eq('email', normalizedEmail)
        .single();

    // Always return same message to avoid enumeration
    const ok = () => res.status(200).json({ message: 'If your email is registered and approved, a magic link has been sent.' });

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

        if (!insertContractorError) {
            contractor = insertedContractor;
            lookupError = null;
        }
    }

    const hasAccess = Boolean(contractor && (contractor.approved || emailAccess.isApproved));
    if (lookupError || !contractor || !hasAccess) return ok();

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours

    const { error: insertError } = await supabase.from('magic_links').insert({
        contractor_id: contractor.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
    });

    if (insertError) {
        console.error('[contractor/request-link]', insertError.message);
        return ok(); // still return ok to avoid leaking info
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanstone.co';
    const magicUrl = `${baseUrl}/api/contractor/verify?token=${encodeURIComponent(token)}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
        from: 'Urban Stone <no-reply@urbanstone.co>',
        to: normalizedEmail,
        subject: 'Your Urban Stone Contractor Portal Access',
        html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
        <h2 style="color:#4a90e2;margin-bottom:8px;">Urban Stone</h2>
        <p style="color:#a8afc0;font-size:13px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:24px;">Contractor Portal</p>
        <p>Click the link below to access your contractor pricing. This link expires in 30 minutes.</p>
        <a href="${magicUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#4a90e2;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Access Contractor Portal
        </a>
        <p style="color:#a8afc0;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    });

    if (emailError) {
        console.error('[contractor/request-link] email send failed:', emailError);
    } else {
        console.log('[contractor/request-link] magic link sent to', normalizedEmail);
    }

    return ok();
}
