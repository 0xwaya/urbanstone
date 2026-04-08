// Free/consumer email domains that are not considered private business domains.
const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au',
    'hotmail.com', 'hotmail.co.uk', 'hotmail.ca',
    'outlook.com', 'outlook.co.uk',
    'live.com', 'live.co.uk', 'msn.com',
    'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'aol.co.uk',
    'protonmail.com', 'proton.me',
    'zoho.com',
]);

// Free website hosting domains — a website on these is not a business domain signal.
const FREE_HOST_DOMAINS = new Set([
    'github.io', 'netlify.app', 'vercel.app',
    'wix.com', 'wixsite.com', 'wordpress.com', 'weebly.com',
    'squarespace.com', 'godaddysites.com', 'webador.com',
    'blogspot.com', 'tumblr.com',
]);

/**
 * Returns true if the email uses a private (non-free-provider) domain.
 * A business email like john@abccontracting.com would return true.
 */
export function hasPrivateEmailDomain(email) {
    const domain = String(email || '').trim().toLowerCase().split('@')[1] || '';
    return Boolean(domain) && !FREE_EMAIL_DOMAINS.has(domain);
}

/**
 * Returns true if the website is on a real registered domain (not a free host).
 */
export function hasBusinessWebsite(website) {
    try {
        const host = new URL(website).hostname.replace(/^www\./, '').toLowerCase();
        return Boolean(host) && !FREE_HOST_DOMAINS.has(host);
    } catch {
        return false;
    }
}

// Hard-coded whitelists — edit here and push; no Vercel env vars needed.
// Env overrides (CONTRACTOR_ADMIN_EMAILS / CONTRACTOR_APPROVED_EMAILS) are
// merged in at runtime so you can still add entries without a redeploy.
export const STATIC_ADMIN_EMAILS = [
    'sales@urbanstone.co',
    'admin@wayalabs.com',
    'mercado.ea@gmail.com',
];

export const STATIC_APPROVED_EMAILS = [
    'fchomesolutions513@gmail.com',
];

function parseEmailList(value) {
    return (
        String(value || '')
            .split(',')
            .map(email => normalizeEmail(email))
            .filter(Boolean)
    );
}

export function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

export function getContractorAdminEmails() {
    const fromEnv = parseEmailList(process.env.CONTRACTOR_ADMIN_EMAILS);
    return new Set([...STATIC_ADMIN_EMAILS.map(normalizeEmail), ...fromEnv]);
}

export function getContractorApprovedEmails() {
    const fromEnv = parseEmailList(process.env.CONTRACTOR_APPROVED_EMAILS);
    return new Set([...STATIC_APPROVED_EMAILS.map(normalizeEmail), ...fromEnv]);
}

export function getEmailAccess(email) {
    const normalizedEmail = normalizeEmail(email);
    const isAdmin = getContractorAdminEmails().has(normalizedEmail);
    const isApproved = isAdmin || getContractorApprovedEmails().has(normalizedEmail);

    return {
        normalizedEmail,
        isAdmin,
        isApproved,
    };
}
