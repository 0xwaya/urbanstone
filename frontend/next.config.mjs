import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = process.env.NODE_ENV !== 'production';

function supabaseConnectSources() {
    const configured = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    if (!configured) return [];

    try {
        const url = new URL(configured);
        const localHttp = isDevelopment && url.protocol === 'http:'
            && ['localhost', '127.0.0.1'].includes(url.hostname);
        if ((!localHttp && url.protocol !== 'https:') || url.username || url.password) return [];
        return [url.origin, `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`];
    } catch {
        return [];
    }
}

const supabaseConnect = supabaseConnectSources();

const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "base-uri 'self'",
            `connect-src 'self' ${supabaseConnect.join(' ')}`.trim(),
            "font-src 'self' https://fonts.gstatic.com",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "img-src 'self' data: https:",
            "object-src 'none'",
            `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            'upgrade-insecure-requests',
        ].join('; '),
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), geolocation=(), microphone=()'
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'X-Frame-Options',
        value: 'DENY',
    },
];

const nextConfig = {
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.msisurfaces.com',
            },
            {
                protocol: 'https',
                hostname: 'www.daltile.com',
            },
            {
                protocol: 'https',
                hostname: 'myquartzamerica.com',
            },
            {
                protocol: 'https',
                hostname: 'www.citiquartz.com',
            },
        ],
    },
    output: 'standalone',
    outputFileTracingRoot: __dirname,
    poweredByHeader: false,
    reactStrictMode: true,
    compress: true,
    env: {
        SITE_BUILD_DATE: new Date().toISOString().slice(0, 10),
    },
    async redirects() {
        return [
            // Bare folder paths otherwise show Vercel's public "Index of" listing.
            { source: '/materials', destination: '/', permanent: true },
            { source: '/service-areas', destination: '/', permanent: true },
            { source: '/reviews', destination: '/', permanent: true },
            { source: '/materials/:vendor(avani|citiquartz|daltile|msi|quartamerica)', destination: '/', permanent: true },
            {
                source: '/:path*',
                has: [{ type: 'host', value: 'urbanstone.co' }],
                destination: 'https://www.urbanstone.co/:path*',
                permanent: true,
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
            {
                source: '/api/:path*',
                headers: [
                    ...securityHeaders,
                    {
                        key: 'Cache-Control',
                        value: 'no-store',
                    },
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex, nofollow, noarchive',
                    },
                ],
            },
            {
                source: '/api/og-image',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
                    },
                ],
            },
            {
                source: '/ai-chat',
                headers: [
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex, follow',
                    },
                ],
            },
            {
                source: '/contractors/login',
                headers: [
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex, nofollow, noarchive',
                    },
                ],
            },
            {
                source: '/reviews/invite',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'no-referrer',
                    },
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex, nofollow, noarchive',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
