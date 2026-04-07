import { getSupabase } from '../../../lib/supabase';
import { getEmailAccess, hasPrivateEmailDomain, hasBusinessWebsite } from '../../../lib/contractor-access';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const ipTimestamps = new Map();

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

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRate(ip)) return res.status(429).json({ error: 'Too many requests' });

    const { email, company_name, website } = req.body || {};

    if (!email || !company_name || !website) {
        return res.status(400).json({ error: 'email, company_name, and website are required' });
    }
    if (typeof email !== 'string' || !email.includes('@') || email.length > 254) {
        return res.status(400).json({ error: 'Invalid email' });
    }
    if (typeof company_name !== 'string' || company_name.trim().length < 2 || company_name.length > 120) {
        return res.status(400).json({ error: 'Invalid company name' });
    }
    if (!isValidUrl(website) || website.length > 512) {
        return res.status(400).json({ error: 'Invalid website URL' });
    }

    const emailAccess = getEmailAccess(email);
    const supabase = getSupabase();

    // Auto-approve if the email is from a private (non-free-provider) domain,
    // or if they provide a real business website. Both are signals of a real contractor.
    const autoApprove = emailAccess.isApproved
        || hasPrivateEmailDomain(email)
        || hasBusinessWebsite(website);

    const { error } = await supabase.from('contractors').insert({
        email: emailAccess.normalizedEmail,
        company_name: company_name.trim(),
        website: website.trim(),
        approved: autoApprove,
    });

    if (error) {
        if (error.code === '23505') {
            // Already registered — return same message to avoid enumeration
            return res.status(201).json({
                message: autoApprove
                    ? 'Access is approved for this email. You can request a magic link now.'
                    : 'Application received. We will review and send a magic link when approved.',
            });
        }
        console.error('[contractor/register]', error.message);
        return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }

    // Notify owner via existing webhook relay
    const webhookUrl = process.env.LEAD_WEBHOOK_URL;
    if (webhookUrl) {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'contractor_registration',
                email: emailAccess.normalizedEmail,
                company_name: company_name.trim(),
                website: website.trim(),
                note: autoApprove
                    ? 'Auto-approved (private domain or business website). Contractor can request a magic link now.'
                    : 'Pending manual approval — set approved = true in Supabase dashboard.',
            }),
        }).catch(() => { }); // don't block response on webhook failure
    }

    return res.status(201).json({
        message: autoApprove
            ? 'Access is approved for this email. You can request a magic link now.'
            : 'Application received. We will review and send a magic link when approved.',
    });
}
