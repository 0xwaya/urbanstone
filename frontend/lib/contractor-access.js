// Hard-coded whitelists — edit here and push; no Vercel env vars needed.
// Env overrides (CONTRACTOR_ADMIN_EMAILS / CONTRACTOR_APPROVED_EMAILS) are
// merged in at runtime so you can still add entries without a redeploy.
const STATIC_ADMIN_EMAILS = [
    'sales@urbanstone.co',
    'mercado.ea@gmail.com',
];

const STATIC_APPROVED_EMAILS = [
    'fchomesolutions513@gmail.com',
];

function parseEmailList(value) {
    return (
        String(value || '')
            .split(',')
            .map(email => email.trim().toLowerCase())
            .filter(Boolean)
    );
}

export function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

export function getContractorAdminEmails() {
    const fromEnv = parseEmailList(process.env.CONTRACTOR_ADMIN_EMAILS);
    return new Set([...STATIC_ADMIN_EMAILS, ...fromEnv]);
}

export function getContractorApprovedEmails() {
    const fromEnv = parseEmailList(process.env.CONTRACTOR_APPROVED_EMAILS);
    return new Set([...STATIC_APPROVED_EMAILS, ...fromEnv]);
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
