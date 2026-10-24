import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const REVIEW_INVITE_TTL_DAYS = 14;
export const MIN_REVIEW_LENGTH = 20;
export const MAX_REVIEW_LENGTH = 2000;

export function normalizeReviewEmail(value) {
    const email = String(value || '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
    return email;
}

export function createReviewInviteToken() {
    return randomBytes(32).toString('base64url');
}

export function hashReviewInviteToken(token) {
    return createHash('sha256').update(String(token || '')).digest('hex');
}

export function hashReviewInviteEmail(email, secret) {
    const normalizedEmail = normalizeReviewEmail(email);
    const hmacSecret = String(secret || '');
    if (!normalizedEmail) throw new Error('A valid invite email is required.');
    if (Buffer.byteLength(hmacSecret, 'utf8') < 32) {
        throw new Error('REVIEW_INVITE_EMAIL_HMAC_KEY must be at least 32 bytes.');
    }
    return createHmac('sha256', hmacSecret).update(normalizedEmail).digest('hex');
}

export function constantTimeEqual(left, right) {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function validateReviewSubmission(body = {}) {
    const displayName = String(body.displayName || '').normalize('NFC').trim().replace(/\s+/g, ' ');
    const reviewText = String(body.reviewText || '').trim();
    const rating = Number(body.rating);
    const inviteToken = String(body.inviteToken || '').trim();
    const errors = {};

    if (displayName.length < 1 || displayName.length > 80 || /[<>`\u0000-\u001f\u007f]/.test(displayName)) {
        errors.displayName = 'Enter a display name of 1 to 80 characters.';
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors.rating = 'Choose a rating from 1 to 5.';
    }
    if (reviewText.length < MIN_REVIEW_LENGTH || reviewText.length > MAX_REVIEW_LENGTH) {
        errors.reviewText = `Review must be ${MIN_REVIEW_LENGTH} to ${MAX_REVIEW_LENGTH} characters.`;
    }
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(inviteToken)) {
        errors.inviteToken = 'A valid invitation is required.';
    }

    return {
        ok: Object.keys(errors).length === 0,
        errors,
        data: { displayName, rating, reviewText, inviteToken },
    };
}

export function getBearerToken(header) {
    const value = String(header || '').trim();
    if (!/^Bearer\s+/i.test(value)) return '';
    return value.replace(/^Bearer\s+/i, '').trim();
}
