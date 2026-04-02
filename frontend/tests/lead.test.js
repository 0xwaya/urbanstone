import { buildLeadForwardPayload, isRateLimited, sanitizeLeadPayload } from '../lib/lead';

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
            materialPreferences: ['quartz', 'granite'],
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
        expect(result.data.materialPreferences).toEqual(['quartz', 'granite']);
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
            materialPreferences: ['quartzite'],
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
                materialPreferences: ['quartz'],
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
        expect(payload.source).toBe('urban-stone-site');
        expect(payload.lead.materialPreferences).toEqual(['quartz']);
    });
});