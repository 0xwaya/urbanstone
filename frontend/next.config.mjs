import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = process.env.NODE_ENV !== 'production';

const securityHeaders = [
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "base-uri 'self'",
            "connect-src 'self'",
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
                ],
            },
        ];
    },
};

export default nextConfig;