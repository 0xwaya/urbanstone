// Draft tests for the Facebook Marketplace source (no network: pure functions only).
import {
    assessMarketplaceCanary,
    buildAllowedCitySet,
    FB_MARKETPLACE_SELLER_PLACEHOLDER,
    isAllowedMarketplaceLocation,
    normalizeMarketplaceItem,
} from '../src/apify.js';
import { classifyMarketplaceListing } from '../src/core/classification.js';
import { buildLeadPayload } from '../src/matcher.js';

// Shape follows the curious_coder/facebook-marketplace README sample output.
const sample = (overrides = {}) => ({
    id: '1384077819184401',
    listing_price: { formatted_amount: '$350', amount: '350.00', currency: 'USD' },
    location: { reverse_geocode: { city: 'Mason', state: 'OH' } },
    location_text: { text: 'Mason, OH' },
    is_sold: false,
    is_pending: false,
    marketplace_listing_title: 'Granite countertops - removed during kitchen remodel',
    marketplace_listing_seller: { name: 'Jane Private', id: 'pfbid0SECRET' },
    seller: { id: 'pfbid0SECRET' },
    story: { url: 'https://www.facebook.com/marketplace/item/1384077819184401/', actors: [{ name: 'Jane Private' }] },
    redacted_description: { text: 'Old countertops came out of our kitchen, about 40 sq ft. Pickup only.' },
    creation_time: 1761652800,
    ...overrides,
});

describe('normalizeMarketplaceItem', () => {
    test('maps title, price, location, link, description, posting time', () => {
        const post = normalizeMarketplaceItem(sample());
        expect(post.source).toBe('apify-facebook-marketplace');
        expect(post.id).toBe('apify:facebook-marketplace:1384077819184401');
        expect(post.title).toBe('Granite countertops - removed during kitchen remodel');
        expect(post.url).toBe('https://www.facebook.com/marketplace/item/1384077819184401/');
        expect(post.body).toContain('Old countertops came out of our kitchen');
        expect(post.body).toContain('Price: $350');
        expect(post.body).toContain('Location: Mason, OH');
        expect(post.createdAt).toBe(new Date(1761652800 * 1000).toISOString());
        expect(post.marketplace).toMatchObject({ price: 350, city: 'Mason', state: 'OH', isSold: false });
    });

    test('never carries the seller name anywhere (post or webhook payload)', () => {
        const post = normalizeMarketplaceItem(sample());
        expect(post.author).toBe(FB_MARKETPLACE_SELLER_PLACEHOLDER);
        expect(JSON.stringify(post)).not.toMatch(/Jane Private|pfbid0SECRET/);
        const payload = buildLeadPayload(post, { verdict: 'match', scoreResult: { score: 60, band: 'warm' } });
        expect(JSON.stringify(payload)).not.toMatch(/Jane Private|pfbid0SECRET/);
    });

    test('builds the item link from id and falls back to location_text', () => {
        const post = normalizeMarketplaceItem(sample({ story: undefined, location: undefined, location_text: { text: 'Florence, KY' } }));
        expect(post.url).toBe('https://www.facebook.com/marketplace/item/1384077819184401/');
        expect(post.marketplace).toMatchObject({ city: 'Florence', state: 'KY' });
    });

    test('never "(untitled post)"', () => {
        const post = normalizeMarketplaceItem(sample({ marketplace_listing_title: undefined }));
        expect(post.title).not.toBe('(untitled post)');
        expect(post.title).toContain('Old countertops');
    });
});

describe('Cincinnati-area location filter', () => {
    const allowed = buildAllowedCitySet();
    const at = (city, state) => normalizeMarketplaceItem(sample({ location: { reverse_geocode: { city, state } } }));
    test.each([['Cincinnati', 'OH'], ['West Chester', 'OH'], ['Covington', 'KY'], ['Fort Thomas', 'KY'], ['Lawrenceburg', 'IN'], ['Cincinnati', 'Ohio']])('keeps %s, %s', (c, s) => {
        expect(isAllowedMarketplaceLocation(at(c, s), allowed)).toBe(true);
    });
    test.each([['Dayton', 'OH'], ['Columbus', 'OH'], ['Hamilton', 'ON'], ['Florence', 'AL'], ['Lexington', 'KY']])('drops %s, %s', (c, s) => {
        expect(isAllowedMarketplaceLocation(at(c, s), allowed)).toBe(false);
    });
    test('drops listings with no location', () => {
        const post = normalizeMarketplaceItem(sample({ location: undefined, location_text: undefined }));
        expect(isAllowedMarketplaceLocation(post, allowed)).toBe(false);
    });
});

describe('classifyMarketplaceListing (selling vs buying)', () => {
    const kind = (title, body = '', price = 300) => classifyMarketplaceListing({ title, body, price }).marketplace.kind;
    test('plain inventory is rejected, even with a countertop anchor', () => {
        expect(kind('Granite countertop for sale', 'Brand new, never installed. Pickup only.')).toBe('inventory');
        expect(kind('Quartz vanity top 61 inch', '', 150)).toBe('inventory');
        expect(classifyMarketplaceListing({ title: 'Granite countertop for sale', price: 300 }).verdict).toBe('reject');
    });
    test('ISO / wanted posts are matches', () => {
        expect(kind('ISO granite countertop installer', '', 0)).toBe('wanted');
        expect(kind('Looking for someone to install quartz countertops', '', 1)).toBe('wanted');
        expect(classifyMarketplaceListing({ title: 'WTB quartz remnant for vanity top', price: 0 }).verdict).toBe('match');
    });
    test('"looking for" inside a priced seller description is not demand', () => {
        expect(kind('Kitchen island with granite top', 'Great for anyone looking for an upgrade', 400)).toBe('inventory');
    });
    test('remodel sellers go to review', () => {
        expect(kind('Old countertops removed during remodel', 'Granite, 3 pieces', 100)).toBe('remodel');
        expect(kind('Kitchen cabinets', 'Tearing out our kitchen, cabinets and counters must go', 500)).toBe('remodel');
        expect(classifyMarketplaceListing({ title: 'Old countertops removed', body: 'granite', price: 50 }).verdict).toBe('review');
    });
    test('dealers / remnant yards / competitor ads are rejected', () => {
        expect(kind('Quartz countertops installed', 'We install! Free estimates. Licensed and insured.', 45)).toBe('dealer');
        expect(kind('Granite remnant sale', 'Remnant yard open Saturday', 99)).toBe('dealer');
        expect(kind('ISO countertop jobs', 'Our company, fabrication shop in Fairfield', 0)).toBe('dealer');
    });
    test('"inc" inside other words is not a dealer signal', () => {
        expect(kind('ISO countertop installer', 'including backsplash', 0)).toBe('wanted');
    });
});

describe('canary health', () => {
    test('healthy at >= 5 items and SUCCEEDED', () => {
        expect(assessMarketplaceCanary({ runStatus: 'SUCCEEDED', itemCount: 5, minResults: 5 }).healthy).toBe(true);
    });
    test.each([
        ['SUCCEEDED', 0],
        ['SUCCEEDED', 4],
        ['FAILED', 20],
        ['TIMED-OUT', 20],
        ['ABORTED', 20],
        [undefined, 20],
    ])('unhealthy when status=%s items=%s', (runStatus, itemCount) => {
        expect(assessMarketplaceCanary({ runStatus, itemCount, minResults: 5 }).healthy).toBe(false);
    });
});
