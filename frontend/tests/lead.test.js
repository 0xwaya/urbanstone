import { buildLeadForwardPayload, isRateLimited, sanitizeLeadPayload } from '../lib/lead';

describe('sanitizeLeadPayload', () => {
    it('returns sanitized lead data for valid submissions', () => {
        const result = sanitizeLeadPayload({
            name: '  Jamie Stone  ',
            email: 'JAMIE@example.com ',
            phone: '(513) 555-0101',
            projectDetails: 'Kitchen remodel with waterfall island and 2 bathroom vanity tops.',
            website: '',
        });

        expect(result.ok).toBe(true);
        expect(result.errors).toEqual({});
        expect(result.data).toMatchObject({
            name: 'Jamie Stone',
            email: 'jamie@example.com',
            phone: '(513) 555-0101',
        });
    });

    it('rejects invalid or suspicious submissions', () => {
        const result = sanitizeLeadPayload({
            name: 'A',
            email: 'not-an-email',
            phone: 'abc',
            projectDetails: 'short note',
            website: 'https://spam.example',
        });

        expect(result.ok).toBe(false);
        expect(result.errors).toMatchObject({
            name: expect.any(String),
            email: expect.any(String),
            phone: expect.any(String),
            projectDetails: expect.any(String),
            website: expect.any(String),
        });
    });
});

describe('isRateLimited', () => {
    it('limits repeated requests inside the same window', () => {
        const store = new Map();

        expect(isRateLimited(store, '127.0.0.1', 2, 1000)).toBe(false);
        expect(isRateLimited(store, '127.0.0.1', 2, 1000)).toBe(false);
        expect(isRateLimited(store, '127.0.0.1', 2, 1000)).toBe(true);
    });
});

describe('buildLeadForwardPayload', () => {
    it('includes lead and request metadata without mutating the input', () => {
        const payload = buildLeadForwardPayload(
            {
                name: 'Jamie Stone',
                email: 'jamie@example.com',
                phone: '(513) 555-0101',
                projectDetails: 'Kitchen remodel with waterfall island and 2 bathroom vanity tops.',
            },
            {
                headers: {
                    host: 'localhost:3000',
                    referer: 'http://localhost:3000/',
                    'user-agent': 'vitest',
                    'x-forwarded-for': '203.0.113.55',
                },
                socket: {},
            }
        );

        expect(payload.lead.name).toBe('Jamie Stone');
        expect(payload.metadata.ip).toBe('203.0.113.55');
        expect(payload.source).toBe('amazon-granite-site');
    });
});