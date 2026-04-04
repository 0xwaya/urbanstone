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

export function getSiteUrl() {
    return normalizeSiteUrl(
        process.env.NEXT_PUBLIC_SITE_URL
        || process.env.SITE_URL
        || process.env.VERCEL_PROJECT_PRODUCTION_URL
        || process.env.VERCEL_URL
    );
}

export function getCanonicalUrl(pathname = '/') {
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${getSiteUrl()}${normalizedPath === '/' ? '' : normalizedPath}`;
}