import { constantTimeEqual } from './reviews';

export function hasReviewAdminSecret() {
    return Buffer.byteLength(String(process.env.REVIEW_INVITE_ADMIN_SECRET || ''), 'utf8') >= 32;
}

export function isReviewAdminRequest(request) {
    const secret = String(process.env.REVIEW_INVITE_ADMIN_SECRET || '');
    const authorization = String(request.headers.authorization || '');
    const candidate = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim() || '';
    return hasReviewAdminSecret() && constantTimeEqual(candidate, secret);
}
