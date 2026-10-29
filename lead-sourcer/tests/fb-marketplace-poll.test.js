// Draft: pollApify wiring for the Marketplace source with a mocked Apify client (no network).
import { jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fbm-'));
process.env.APIFY_TOKEN = 'test-token';
process.env.APIFY_ENABLE_NEXTDOOR = 'false';
process.env.APIFY_ENABLE_FACEBOOK = 'false';
process.env.APIFY_ENABLE_FB_MARKETPLACE = 'true';
process.env.APIFY_FB_MARKETPLACE_TASK_ID = 'main-task';
process.env.APIFY_FB_MARKETPLACE_CANARY_TASK_ID = 'canary-task';
process.env.APIFY_TASK_DELAY_MS = '0';
process.env.LEAD_SOURCER_REVIEW_LOG_FILE = path.join(tmp, 'review-candidates.jsonl');
process.env.LEAD_SOURCER_NEAR_MISS_LOG_FILE = path.join(tmp, 'near-miss.jsonl');
process.env.LEAD_SOURCER_DEDUP_FILE = path.join(tmp, 'seen-ids.json');
process.env.LEAD_SOURCER_SKIP_DEDUP = 'true';

const listing = (id, title, city = 'Cincinnati', price = '0', extra = {}) => ({
    id, marketplace_listing_title: title, listing_price: { amount: price, formatted_amount: `$${price}` },
    location: { reverse_geocode: { city, state: 'OH' } }, marketplace_listing_seller: { name: 'Seller Name' }, ...extra,
});

const state = { canary: { status: 'SUCCEEDED', items: 8 }, main: [], calls: [] };
jest.unstable_mockModule('apify-client', () => ({
    ApifyClient: class {
        task(id) {
            return {
                get: async () => ({ id, input: {} }),
                call: async (input, options) => {
                    state.calls.push({ id, input, options });
                    if (id === 'canary-task') return { id: 'r1', status: state.canary.status, defaultDatasetId: 'ds-canary' };
                    return { id: 'r2', status: 'SUCCEEDED', defaultDatasetId: 'ds-main' };
                },
            };
        }
        dataset(id) {
            return {
                listItems: async () => ({
                    items: id === 'ds-canary'
                        ? Array.from({ length: state.canary.items }, (_, i) => listing(`c${i}`, 'Kitchen cabinets', 'Cincinnati', '200'))
                        : state.main,
                }),
            };
        }
    },
}));

const { pollApify } = await import('../src/apify.js');

beforeEach(() => { state.calls = []; });

test('healthy canary: main runs with spend cap, out-of-area dropped, only wanted is a match', async () => {
    state.canary = { status: 'SUCCEEDED', items: 8 };
    state.main = [
        listing('1', 'ISO granite countertop installer', 'Mason'),
        listing('2', 'Granite countertop for sale', 'Cincinnati', '300'),
        listing('3', 'ISO quartz countertops', 'Columbus'),
        listing('4', 'Old countertops removed during remodel', 'Covington', '50', { location: { reverse_geocode: { city: 'Covington', state: 'KY' } } }),
    ];
    const { matches, stats } = await pollApify({ mode: 'review-only' });
    expect(stats.status).toBe('ok');
    const mainCall = state.calls.find((c) => c.id === 'main-task');
    expect(mainCall.options).toMatchObject({ maxTotalChargeUsd: 0.5, maxItems: 210 });
    const canaryCall = state.calls.find((c) => c.id === 'canary-task');
    expect(canaryCall.options).toMatchObject({ maxTotalChargeUsd: 0.05, maxItems: 20 });
    expect(matches.map((m) => m.id)).toEqual(['apify:facebook-marketplace:1']);
    const t = stats.byTask['facebook-marketplace'];
    expect(t).toMatchObject({ droppedOutOfArea: 1, kind_wanted: 1, kind_inventory: 1, kind_remodel: 1 });
    const log = fs.readFileSync(process.env.LEAD_SOURCER_REVIEW_LOG_FILE, 'utf8');
    expect(log).toContain('marketplace-remodel-signal');
    expect(log).not.toContain('Seller Name');
});

test.each([
    [{ status: 'SUCCEEDED', items: 3 }],
    [{ status: 'FAILED', items: 20 }],
])('unhealthy canary %o: degraded, main search skipped, never "0, ok"', async (canary) => {
    state.canary = canary;
    state.main = [listing('9', 'ISO countertop', 'Mason')];
    const { matches, stats } = await pollApify({ mode: 'review-only' });
    expect(stats.status).toBe('degraded');
    expect(stats.unhealthyReasons.join(' ')).toMatch(/canary/);
    expect(state.calls.some((c) => c.id === 'main-task')).toBe(false);
    expect(matches).toEqual([]);
});
