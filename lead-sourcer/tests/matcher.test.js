import { matchesKeywords, isRecent, buildLeadPayload } from '../src/matcher.js';

describe('matchesKeywords', () => {
    test('returns true when text contains a keyword', () => {
        expect(matchesKeywords('Need countertop installation quote')).toBe(true);
    });

    test('returns true when body contains material plus service intent', () => {
        expect(matchesKeywords('Home project — granite countertops, looking to hire an installer')).toBe(true);
    });

    test('is case-insensitive', () => {
        expect(matchesKeywords('QUARTZ COUNTERTOP install by a contractor')).toBe(true);
    });

    test('returns false when no keyword matches', () => {
        expect(matchesKeywords('Best pizza spots in Cincinnati — great crust, amazing toppings')).toBe(false);
    });

    test('returns false for empty input', () => {
        expect(matchesKeywords('')).toBe(false);
    });

    test('returns true for remodel context with buying intent', () => {
        expect(matchesKeywords('kitchen remodel and looking for countertop pricing')).toBe(true);
    });

    test('matches normalized punctuation and spacing', () => {
        expect(matchesKeywords('Need counter-top replacement ASAP')).toBe(true);
    });

    test('matches expanded bathroom coverage', () => {
        expect(matchesKeywords('Planning a bath remodel and need countertop pricing')).toBe(true);
    });

    test('matches project context only when paired with intent', () => {
        expect(matchesKeywords('Bathroom remodel and looking for quartz installer recommendations')).toBe(true);
    });

    test('does not match generic remodel chatter without buying intent', () => {
        expect(matchesKeywords('Bathroom remodel inspiration board for our new house')).toBe(false);
    });

    test('does not match excluded noise terms even when material appears', () => {
        expect(matchesKeywords('Caulking around sink and granite line cracking')).toBe(false);
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
        expect(metadata).toHaveProperty('dedupeKey', 'abc123');
    });

    test('projectDetails concatenates title and body', () => {
        const { lead } = buildLeadPayload(sample);
        expect(lead.projectDetails).toContain(sample.title);
        expect(lead.projectDetails).toContain(sample.body);
    });
});
