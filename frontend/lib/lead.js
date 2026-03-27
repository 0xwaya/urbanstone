const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9()+.\-\s]{7,24}$/;

function normalizeField(value, maxLength) {
    return String(value || '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function normalizeMultiline(value, maxLength) {
    return String(value || '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, maxLength);
}

export function sanitizeLeadPayload(payload = {}) {
    const lead = {
        name: normalizeField(payload.name, 80),
        email: normalizeField(payload.email, 120).toLowerCase(),
        phone: normalizeField(payload.phone, 24),
        projectDetails: normalizeMultiline(payload.projectDetails, 1200),
        routeId: normalizeField(payload.routeId, 80),
        website: normalizeField(payload.website, 120),
    };

    const errors = {};

    if (lead.website) {
        errors.website = 'Spam protection triggered.';
    }
    if (lead.name.length < 2) {
        errors.name = 'Enter the customer name.';
    }
    if (!EMAIL_PATTERN.test(lead.email)) {
        errors.email = 'Enter a valid email address.';
    }
    if (!PHONE_PATTERN.test(lead.phone)) {
        errors.phone = 'Enter a valid phone number.';
    }
    if (lead.projectDetails.length < 20) {
        errors.projectDetails = 'Add at least a few details about the project.';
    }

    return {
        data: lead,
        errors,
        ok: Object.keys(errors).length === 0,
    };
}

export function getClientIp(request) {
    const forwarded = request.headers['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }

    return request.socket?.remoteAddress || 'unknown';
}

export function getRateLimitStore() {
    if (!globalThis.__amazonGraniteLeadRateLimitStore) {
        globalThis.__amazonGraniteLeadRateLimitStore = new Map();
    }

    return globalThis.__amazonGraniteLeadRateLimitStore;
}

export function isRateLimited(store, key, limit, windowMs) {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    if (entry.count >= limit) {
        return true;
    }

    entry.count += 1;
    return false;
}

export function isSameOriginRequest(request) {
    const originHeader = request.headers.origin;

    if (!originHeader) {
        return true;
    }

    const host = request.headers['x-forwarded-host'] || request.headers.host;

    if (!host) {
        return false;
    }

    try {
        const origin = new URL(originHeader);
        return origin.host === host;
    } catch {
        return false;
    }
}

export function buildLeadForwardPayload(lead, request) {
    return {
        submittedAt: new Date().toISOString(),
        source: 'amazon-granite-site',
        lead: {
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            projectDetails: lead.projectDetails,
        },
        metadata: {
            ip: getClientIp(request),
            userAgent: request.headers['user-agent'] || 'unknown',
            referer: request.headers.referer || null,
            routeId: lead.routeId || 'homepage',
        },
    };
}