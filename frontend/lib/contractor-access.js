function parseEmailList(value) {
    return new Set(
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
    return parseEmailList(process.env.CONTRACTOR_ADMIN_EMAILS);
}

export function getContractorApprovedEmails() {
    return parseEmailList(process.env.CONTRACTOR_APPROVED_EMAILS);
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
