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
    if (req.method !== 'GET') return res.status(405).end();

    const { token } = req.query;
    if (!token || typeof token !== 'string' || token.length > 256) {
        return res.status(400).send('Invalid or missing token.');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const supabase = getSupabase();

    const { data: link, error } = await supabase
        .from('magic_links')
        .select('id, contractor_id, expires_at, used')
        .eq('token_hash', tokenHash)
        .single();

    if (error || !link) return res.status(400).send('Link not found or already used.');
    if (link.used) return res.status(400).send('This link has already been used. Request a new one.');
    if (new Date(link.expires_at) < new Date()) return res.status(400).send('Link has expired. Request a new one.');

    // Mark token as used and update last_login_at
    await supabase.from('magic_links').update({ used: true }).eq('id', link.id);
    await supabase.from('contractors').update({ last_login_at: new Date().toISOString() }).eq('id', link.contractor_id);

    const secret = process.env.CONTRACTOR_SESSION_SECRET;
    if (!secret) {
        console.error('[contractor/verify] CONTRACTOR_SESSION_SECRET is not set');
        return res.status(500).send('Server configuration error.');
    }

    const sessionValue = signPayload({ sub: link.contractor_id, iat: Date.now() }, secret);

    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sessionValue}; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Path=/`);
    res.redirect(302, '/contractors');
}
