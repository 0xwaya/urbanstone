import { promises as dns } from 'node:dns';
import net from 'node:net';

export const MIN_FILL_MS = 3000;
export const HONEYPOT_FIELD = 'company_fax';

/** Returns a reason string when the submission looks automated, otherwise null. */
export function detectBotSubmission(body = {}, now = Date.now()) {
    if (String(body[HONEYPOT_FIELD] || '').trim()) return 'honeypot';
    const startedAt = Number(body.form_started_at);
    if (!Number.isFinite(startedAt) || startedAt <= 0) return 'missing_timer';
    if (now - startedAt < MIN_FILL_MS) return 'too_fast';
    return null;
}

const VOWELS = /[aeiouy]/i;

function looksGibberishWord(word) {
    const letters = word.toLowerCase().replace(/[^a-z]/g, '');
    if (letters.length < 6) return false;
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(letters)) return true;
    const vowelCount = [...letters].filter(ch => VOWELS.test(ch)).length;
    return vowelCount / letters.length < 0.2;
}

/** Cheap heuristics for random-looking names, emails and domains. Flags only, never blocks. */
export function getGibberishFlags({ email = '', companyName = '', website = '' } = {}) {
    const flags = [];
    const name = String(companyName).replace(/\b(llc|inc|co|corp|ltd)\b\.?/gi, ' ');
    if (name.split(/\s+/).filter(Boolean).some(looksGibberishWord)) flags.push('gibberish_name');

    const [local = '', domain = ''] = String(email).toLowerCase().split('@');
    const dotCount = (local.match(/\./g) || []).length;
    if ((domain === 'gmail.com' || domain === 'googlemail.com') && dotCount >= 3) flags.push('dotted_gmail');
    else if (looksGibberishWord(local.replace(/[\d._-]/g, ''))) flags.push('gibberish_email');

    try {
        const host = new URL(website).hostname.replace(/^www\./, '');
        const label = host.split('.')[0] || '';
        if (looksGibberishWord(label)) flags.push('gibberish_domain');
    } catch { /* empty website */ }
    return flags;
}

function isPrivateAddress(address) {
    if (net.isIPv4(address)) {
        const [a, b] = address.split('.').map(Number);
        return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
    }
    const lower = address.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80') || lower === '::';
}

function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/** DNS + HTTP reachability check. Returns { reachable, reason }. */
export async function checkWebsite(website, { timeoutMs = 4000, fetchImpl = fetch, lookup = dns.lookup } = {}) {
    if (!website) return { reachable: null, reason: 'no_website' };
    let url;
    try { url = new URL(website); } catch { return { reachable: false, reason: 'invalid_url' }; }
    try {
        const { address } = await withTimeout(lookup(url.hostname), timeoutMs);
        if (isPrivateAddress(address)) return { reachable: false, reason: 'private_address' };
    } catch {
        return { reachable: false, reason: 'dns_failed' };
    }
    try {
        const response = await fetchImpl(url.toString(), {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': 'UrbanStoneSignupCheck/1.0' },
            signal: AbortSignal.timeout(timeoutMs),
        });
        // Any HTTP answer (even 403 from a bot wall) means a real server is there.
        response.body?.cancel?.().catch?.(() => {});
        return { reachable: response.status < 500, reason: response.status < 500 ? 'ok' : `http_${response.status}` };
    } catch {
        return { reachable: false, reason: 'http_failed' };
    }
}

export function isTurnstileEnabled(env = process.env) {
    return Boolean(String(env.TURNSTILE_SECRET_KEY || '').trim());
}

/** Verifies a Cloudflare Turnstile token. No-op (passes) when TURNSTILE_SECRET_KEY is unset. */
export async function verifyTurnstile(token, ip, { env = process.env, fetchImpl = fetch } = {}) {
    if (!isTurnstileEnabled(env)) return true;
    if (!token || typeof token !== 'string') return false;
    try {
        const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY.trim(), response: token });
        if (ip && ip !== 'unknown') body.set('remoteip', ip);
        const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST', body, signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        return Boolean(data?.success);
    } catch {
        return false;
    }
}

export function renderContractorConfirmEmail(confirmUrl) {
    return `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
        <h2 style="color:#4a90e2;margin-bottom:8px;">Urban Stone</h2>
        <p style="color:#a8afc0;font-size:13px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:24px;">Contractor Program</p>
        <p>Thanks for requesting contractor access. Please confirm your email address so we can review your application.</p>
        <a href="${confirmUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#4a90e2;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Confirm my email
        </a>
        <p style="color:#a8afc0;font-size:12px;">This link expires in 48 hours. If you didn't request access, you can ignore this email.</p>
      </div>
    `;
}
