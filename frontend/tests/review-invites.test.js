import {
    constantTimeEqual,
    createReviewInviteToken,
    hashReviewInviteEmail,
    hashReviewInviteToken,
    normalizeReviewEmail,
    validateReviewSubmission,
} from '../lib/reviews';

const HMAC_KEY = 'test-only-review-email-hmac-key-32-bytes-minimum';

it('normalizes eligible email and stores only a keyed digest', () => {
    expect(normalizeReviewEmail('  Previous.Customer@Example.com ')).toBe('previous.customer@example.com');
    expect(hashReviewInviteEmail('Previous.Customer@Example.com', HMAC_KEY))
        .toBe(hashReviewInviteEmail('previous.customer@example.com', HMAC_KEY));
    expect(hashReviewInviteEmail('previous.customer@example.com', HMAC_KEY))
        .not.toContain('previous.customer@example.com');
    expect(() => hashReviewInviteEmail('customer@example.com', 'short')).toThrow(/32 bytes/);
});

it('creates high-entropy url-safe invitation tokens and stores their digests', () => {
    const token = createReviewInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,64}$/);
    expect(hashReviewInviteToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashReviewInviteToken(token)).not.toBe(token);
});

it('compares admin secrets without accepting missing or different values', () => {
    expect(constantTimeEqual('same-secret', 'same-secret')).toBe(true);
    expect(constantTimeEqual('same-secret', 'other-secret')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(false);
});

it('validates review submissions without filtering on rating or sentiment', () => {
    const input = {
        inviteToken: createReviewInviteToken(),
        displayName: 'Alex P.',
        rating: '1',
        reviewText: 'The installation took longer than expected, but the team resolved my issue.',
    };
    const result = validateReviewSubmission(input);
    expect(result.ok).toBe(true);
    expect(result.data.rating).toBe(1);
    expect(result.data.reviewText).toBe(input.reviewText);
});

it('rejects malformed names, short text, invalid ratings, and absent invitation tokens', () => {
    const result = validateReviewSubmission({
        inviteToken: '',
        displayName: '<script>alert(1)</script>',
        rating: 6,
        reviewText: 'Too short',
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toMatchObject({
        inviteToken: expect.any(String),
        displayName: expect.any(String),
        rating: expect.any(String),
        reviewText: expect.any(String),
    });
});
