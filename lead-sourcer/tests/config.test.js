import {
    CRAIGSLIST_QUERY_KEYWORDS,
    CRAIGSLIST_SECTIONS,
} from '../src/config.js';

describe('Craigslist search defaults', () => {
    test('uses a bounded, buyer-intent query set', () => {
        expect(CRAIGSLIST_QUERY_KEYWORDS.length).toBeLessThanOrEqual(40);
        expect(CRAIGSLIST_QUERY_KEYWORDS).not.toContain('granite');
        expect(CRAIGSLIST_QUERY_KEYWORDS).not.toContain('quartz');
    });

    test('does not search household services by default', () => {
        expect(CRAIGSLIST_SECTIONS.map((section) => section.label)).toEqual(['gigs', 'labor gigs']);
    });
});
