const DEFAULT_SITE_URL = 'https://www.urbanstone.co';

function normalizeSiteUrl(value) {
    if (!value) {
        return DEFAULT_SITE_URL;
    }

    const trimmed = String(value).trim();

    if (!trimmed) {
        return DEFAULT_SITE_URL;
    }

    const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;

    try {
        return new URL(withProtocol).origin;
    } catch {
        return DEFAULT_SITE_URL;
    }
}

function isLocalOrigin(origin) {
    try {
        const { hostname } = new URL(origin);
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    } catch {
        return true;
    }
}

export function getSiteUrl() {
    const resolved = normalizeSiteUrl(
        process.env.NEXT_PUBLIC_SITE_URL
        || process.env.SITE_URL
        || process.env.VERCEL_PROJECT_PRODUCTION_URL
        || process.env.VERCEL_URL
    );

    if (process.env.NODE_ENV === 'production' && isLocalOrigin(resolved)) {
        return DEFAULT_SITE_URL;
    }

    return resolved;
}

export function getCanonicalUrl(pathname = '/') {
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${getSiteUrl()}${normalizedPath === '/' ? '' : normalizedPath}`;
}
