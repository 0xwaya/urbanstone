import { getContractorAdminEmails, normalizeEmail } from '../../../lib/contractor-access';
import crypto from 'crypto';
import { getSupabase } from '../../../lib/supabase';

const COOKIE_NAME = 'contractor_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function signPayload(payload, secret) {
    const data = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return Buffer.from(data).toString('base64url') + '.' + sig;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
    }
    const normalized = normalizeEmail(email);
    const adminEmails = getContractorAdminEmails();
    if (!adminEmails.has(normalized)) {
        return res.status(403).json({ error: 'Not an admin email' });
    }
    const supabase = getSupabase();
    // Ensure contractor exists
    let { data: contractor, error } = await supabase
        .from('contractors')
        .select('id')
        .eq('email', normalized)
        .maybeSingle();
    if (error) {
        return res.status(500).json({ error: 'Database error' });
    }
    if (!contractor) {
        // Insert admin contractor if missing
        const { data: inserted, error: insertError } = await supabase
            .from('contractors')
            .insert({ email: normalized, company_name: 'Admin', website: 'https://urbanstone.co', approved: true })
            .select('id')
            .single();
        if (insertError) {
            return res.status(500).json({ error: 'Could not create admin contractor' });
        }
        contractor = inserted;
    }
    const secret = process.env.CONTRACTOR_SESSION_SECRET;
    if (!secret) {
        return res.status(500).json({ error: 'Server configuration error' });
    }
    const sessionValue = signPayload({
        sub: contractor.id,
        email: normalized,
        role: 'admin',
        iat: Date.now(),
    }, secret);
    const isSecure = process.env.NODE_ENV === 'production';
    const secureFlag = isSecure ? ' Secure;' : '';
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sessionValue}; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Path=/`);
    res.status(200).json({ ok: true });
}
