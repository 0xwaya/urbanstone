import { matchesKeywords, isRecent, buildLeadPayload } from '../src/matcher.js';

describe('matchesKeywords', () => {
    test('returns true when text contains a keyword', () => {
        expect(matchesKeywords('Need countertop installation quote')).toBe(true);
    });

    test('returns true when body contains a keyword (combined string)', () => {
        expect(matchesKeywords('Home project — Looking for granite countertops for my kitchen')).toBe(true);
    });

    test('is case-insensitive', () => {
        expect(matchesKeywords('QUARTZ COUNTERTOP install')).toBe(true);
    });

    test('returns false when no keyword matches', () => {
        expect(matchesKeywords('Best pizza spots in Cincinnati — great crust, amazing toppings')).toBe(false);
    });

    test('returns false for empty input', () => {
        expect(matchesKeywords('')).toBe(false);
    });

    test('returns true for multi-word keyword phrase', () => {
        expect(matchesKeywords('kitchen remodel budget advice')).toBe(true);
    });
});

describe('isRecent', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    test('returns true for a post created 1 hour ago', () => {
        expect(isRecent(nowSeconds - 3600, 48)).toBe(true);
    });

    test('returns true for a post created 47 hours ago', () => {
        expect(isRecent(nowSeconds - 47 * 3600, 48)).toBe(true);
    });

    test('returns false for a post created 49 hours ago', () => {
        expect(isRecent(nowSeconds - 49 * 3600, 48)).toBe(false);
    });

    test('returns false for very old post', () => {
        expect(isRecent(nowSeconds - 7 * 24 * 3600, 48)).toBe(false);
    });
});

describe('buildLeadPayload', () => {
    const sample = {
        id: 'abc123',
        source: 'reddit',
        title: 'Need countertop help',
        body: 'Looking for a quote on granite',
        url: 'https://reddit.com/r/cincinnati/comments/abc123',
        author: 'testuser',
        createdAt: new Date().toISOString(),
    };

    test('returns correct payload shape', () => {
        const payload = buildLeadPayload(sample);
        expect(payload).toHaveProperty('submittedAt');
        expect(payload).toHaveProperty('source', 'reddit');
        expect(payload).toHaveProperty('lead');
        expect(payload).toHaveProperty('metadata');
    });

    test('lead object has required fields', () => {
        const { lead } = buildLeadPayload(sample);
        expect(lead).toHaveProperty('projectDetails');
        expect(lead).toHaveProperty('externalPostId', 'abc123');
        expect(lead).toHaveProperty('externalPostUrl', sample.url);
    });

    test('metadata marks lead as automated', () => {
        const { metadata } = buildLeadPayload(sample);
        expect(metadata).toHaveProperty('automated', true);
        expect(metadata).toHaveProperty('routeId', 'lead-sourcer/reddit');
    });

    test('projectDetails concatenates title and body', () => {
        const { lead } = buildLeadPayload(sample);
        expect(lead.projectDetails).toContain(sample.title);
        expect(lead.projectDetails).toContain(sample.body);
    });
});
