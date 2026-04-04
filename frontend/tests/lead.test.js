import { buildLeadDedupeKey, buildLeadForwardPayload, consumeRateLimit, getLeadApiRuntimeConfig, isLeadDuplicate, isRateLimited, sanitizeLeadPayload } from '../lib/lead';

describe('sanitizeLeadPayload', () => {
    it('returns sanitized lead data for valid submissions', () => {
        const result = sanitizeLeadPayload({
            name: '  Jamie Stone  ',
            email: 'JAMIE@example.com ',
            phone: '(513) 555-0101',
            totalSquareFootage: '54.5',
            currentTopRemoval: 'yes',
            currentTopMaterial: 'Laminate',
            sinkBasinPreference: 'single',
            sinkMountPreference: 'undermount',
            sinkMaterialPreference: 'stainless-steel',
            backsplashPreference: '4-inch',
            timeframeGoal: '2-weeks',
            materialPreferences: ['msi-calacatta-laza', 'daltile-absolute-black'],
            website: '',
        });

        expect(result.ok).toBe(true);
        expect(result.errors).toEqual({});
        expect(result.data).toMatchObject({
            name: 'Jamie Stone',
            email: 'jamie@example.com',
            phone: '(513) 555-0101',
            totalSquareFootage: 54.5,
            currentTopRemoval: 'yes',
            sinkBasinPreference: 'single',
            sinkMountPreference: 'undermount',
            sinkMaterialPreference: 'stainless-steel',
            backsplashPreference: '4-inch',
            timeframeGoal: '2-weeks',
        });
        expect(result.data.materialPreferences).toEqual(['msi-calacatta-laza', 'daltile-absolute-black']);
    });

    it('rejects invalid or suspicious submissions', () => {
        const result = sanitizeLeadPayload({
            name: 'A',
            email: 'not-an-email',
            phone: 'abc',
            totalSquareFootage: '-9',
            currentTopRemoval: '',
            currentTopMaterial: '',
            sinkBasinPreference: '',
            sinkMountPreference: '',
            sinkMaterialPreference: '',
            backsplashPreference: '',
            timeframeGoal: '',
            materialPreferences: [],
            website: 'https://spam.example',
        });

        expect(result.ok).toBe(false);
        expect(result.errors).toMatchObject({
            name: expect.any(String),
            email: expect.any(String),
            phone: expect.any(String),
            totalSquareFootage: expect.any(String),
            currentTopRemoval: expect.any(String),
            currentTopMaterial: expect.any(String),
            sinkBasinPreference: expect.any(String),
            sinkMountPreference: expect.any(String),
            sinkMaterialPreference: expect.any(String),
            backsplashPreference: expect.any(String),
            timeframeGoal: expect.any(String),
            materialPreferences: expect.any(String),
            website: expect.any(String),
        });
    });

    it('accepts image upload without square footage', () => {
        const result = sanitizeLeadPayload({
            name: 'Jamie Stone',
            email: 'jamie@example.com',
            phone: '(513) 555-0101',
            currentTopRemoval: 'no',
            currentTopMaterial: 'Quartz',
            sinkBasinPreference: 'double',
            sinkMountPreference: 'topmount',
            sinkMaterialPreference: 'composite',
            backsplashPreference: 'full-height',
            timeframeGoal: '1-month',
            materialPreferences: ['citi-quartz-pt34-taj-mahal'],
            drawingImage: {
                name: 'rough-layout.jpg',
                type: 'image/jpeg',
                size: 1024,
                dataUrl: 'data:image/jpeg;base64,Zm9vYmFy',
            },
            website: '',
        });

        expect(result.ok).toBe(true);
        expect(result.data.totalSquareFootage).toBeNull();
        expect(result.data.drawingImage?.name).toBe('rough-layout.jpg');
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

describe('consumeRateLimit', () => {
    it('returns retry metadata when the limit is exceeded', () => {
        const store = new Map();

        expect(consumeRateLimit(store, '127.0.0.1', 2, 1000).limited).toBe(false);
        expect(consumeRateLimit(store, '127.0.0.1', 2, 1000).limited).toBe(false);

        const blocked = consumeRateLimit(store, '127.0.0.1', 2, 1000);
        expect(blocked.limited).toBe(true);
        expect(blocked.remaining).toBe(0);
        expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });
});

describe('getLeadApiRuntimeConfig', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
    });

    it('uses defaults when environment values are missing', () => {
        process.env = { ...originalEnv };
        delete process.env.RATE_LIMIT_MAX;
        delete process.env.RATE_LIMIT_WINDOW_MS;
        delete process.env.LEAD_DEDUPE_WINDOW_MS;

        expect(getLeadApiRuntimeConfig()).toEqual({
            rateLimitMax: 5,
            rateLimitWindowMs: 15 * 60 * 1000,
            leadDedupeWindowMs: 60 * 60 * 1000,
        });
    });

    it('accepts positive integer environment overrides', () => {
        process.env = {
            ...originalEnv,
            RATE_LIMIT_MAX: '7',
            RATE_LIMIT_WINDOW_MS: '120000',
            LEAD_DEDUPE_WINDOW_MS: '1800000',
        };

        expect(getLeadApiRuntimeConfig()).toEqual({
            rateLimitMax: 7,
            rateLimitWindowMs: 120000,
            leadDedupeWindowMs: 1800000,
        });
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
                totalSquareFootage: 54,
                currentTopRemoval: 'yes',
                currentTopMaterial: 'Laminate',
                sinkBasinPreference: 'single',
                sinkMountPreference: 'undermount',
                sinkMaterialPreference: 'stainless-steel',
                backsplashPreference: '4-inch',
                timeframeGoal: '2-weeks',
                materialPreferences: ['msi-calacatta-laza'],
                drawingImage: null,
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
        expect(payload.metadata.requestId).toBeTruthy();
        expect(payload.metadata.dedupeKey).toHaveLength(24);
        expect(payload.source).toBe('urban-stone-site');
        expect(payload.lead.materialPreferences).toEqual(['msi-calacatta-laza']);
    });

    it('uses provided x-request-id when available', () => {
        const payload = buildLeadForwardPayload(
            {
                name: 'Jamie Stone',
                email: 'jamie@example.com',
                phone: '(513) 555-0101',
                projectDetails: 'Kitchen remodel with waterfall island and 2 bathroom vanity tops.',
                totalSquareFootage: 54,
                currentTopRemoval: 'yes',
                currentTopMaterial: 'Laminate',
                sinkBasinPreference: 'single',
                sinkMountPreference: 'undermount',
                sinkMaterialPreference: 'stainless-steel',
                backsplashPreference: '4-inch',
                timeframeGoal: '2-weeks',
                materialPreferences: ['msi-calacatta-laza'],
                drawingImage: null,
            },
            {
                headers: {
                    'x-request-id': 'req_12345',
                },
                socket: {},
            }
        );

        expect(payload.metadata.requestId).toBe('req_12345');
    });
});

describe('buildLeadDedupeKey', () => {
    it('is deterministic for equivalent lead content', () => {
        const keyA = buildLeadDedupeKey({
            email: 'JAMIE@EXAMPLE.COM',
            phone: '(513) 555-0101',
            routeId: 'homepage',
            projectDetails: 'Kitchen remodel with waterfall island and 2 bathroom vanity tops.',
            currentTopMaterial: 'Laminate',
            totalSquareFootage: '54',
        });

        const keyB = buildLeadDedupeKey({
            email: 'jamie@example.com',
            phone: '5135550101',
            routeId: 'homepage',
            projectDetails: 'Kitchen remodel with waterfall island and 2 bathroom vanity tops.',
            currentTopMaterial: 'laminate',
            totalSquareFootage: 54,
        });

        expect(keyA).toBe(keyB);
    });
});

describe('isLeadDuplicate', () => {
    it('returns false on first submission and true on repeat within window', () => {
        const store = new Map();

        expect(isLeadDuplicate(store, 'abc123', 60000)).toBe(false);
        expect(isLeadDuplicate(store, 'abc123', 60000)).toBe(true);
    });

    it('returns false after the deduplication window has expired', () => {
        const store = new Map();
        store.set('abc123', Date.now() - 1);

        expect(isLeadDuplicate(store, 'abc123', 60000)).toBe(false);
    });

    it('treats different deduplication keys independently', () => {
        const store = new Map();

        expect(isLeadDuplicate(store, 'key-a', 60000)).toBe(false);
        expect(isLeadDuplicate(store, 'key-b', 60000)).toBe(false);
        expect(isLeadDuplicate(store, 'key-a', 60000)).toBe(true);
        expect(isLeadDuplicate(store, 'key-b', 60000)).toBe(true);
    });
});