import { NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'contractor_session';

function verifySession(cookieValue, secret) {
    if (!cookieValue || !secret) return false;
    const dotIndex = cookieValue.lastIndexOf('.');
    if (dotIndex === -1) return false;
    const data = cookieValue.slice(0, dotIndex);
    const sig = cookieValue.slice(dotIndex + 1);
    const expected = crypto.createHmac('sha256', secret).update(Buffer.from(data, 'base64url').toString()).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
}

export function middleware(req) {
    const { pathname } = req.nextUrl;

    // Only protect /contractors routes (not login)
    if (!pathname.startsWith('/contractors') || pathname.startsWith('/contractors/login')) {
        return NextResponse.next();
    }

    const session = req.cookies.get(COOKIE_NAME)?.value;
    const secret = process.env.CONTRACTOR_SESSION_SECRET;

    if (!session || !verifySession(session, secret)) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/contractors/login';
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/contractors/:path*'],
};
