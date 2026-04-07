import { NextResponse } from 'next/server';

const COOKIE_NAME = 'contractor_session';

function base64UrlToString(input) {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return decodeURIComponent(
        decoded
            .split('')
            .map(c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
            .join('')
    );
}

function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

async function verifySession(cookieValue, secret) {
    if (!cookieValue || !secret) return false;
    const dotIndex = cookieValue.lastIndexOf('.');
    if (dotIndex === -1) return false;
    const data = cookieValue.slice(0, dotIndex);
    const sig = cookieValue.slice(dotIndex + 1);

    try {
        const payload = base64UrlToString(data);
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
        const expected = toHex(signature);
        return timingSafeEqual(sig, expected);
    } catch {
        return false;
    }
}

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    // Only protect /contractors routes (not login)
    if (!pathname.startsWith('/contractors') || pathname.startsWith('/contractors/login')) {
        return NextResponse.next();
    }

    const session = req.cookies.get(COOKIE_NAME)?.value;
    const secret = process.env.CONTRACTOR_SESSION_SECRET;

    if (!session || !(await verifySession(session, secret))) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/contractors/login';
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/contractors/:path*'],
};
