// Live delivery path for Marketplace leads: sales@ only via Resend, never the webhook or the seller.
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
process.env.APIFY_FB_MARKETPLACE_REVIEW_ONLY = 'false';
process.env.RESEND_API_KEY = 'test-key';
process.env.LEAD_WEBHOOK_URL = 'https://hooks.example.invalid/catch';
delete process.env.LEAD_SOURCER_ALERT_EMAIL;
delete process.env.LEAD_SOURCER_RUN_REPORT_EMAIL;
delete process.env.LEAD_SOURCER_WEBHOOK_SECONDARY;

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

test('live mode relays wanted posts to sales@ only, internal-only, without seller details', async () => {
    state.canary = { status: 'SUCCEEDED', items: 8 };
    state.main = [
        listing('1', 'ISO granite countertop installer', 'Mason'),
        listing('2', 'Granite countertop for sale', 'Cincinnati', '300'),
    ];
    const sent = [];
    const savedFetch = global.fetch;
    global.fetch = jest.fn(async (url, init) => {
        sent.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
        return { ok: true, status: 200, json: async () => ({ id: 'x' }), text: async () => '' };
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
        const { matches, stats } = await pollApify({ mode: 'live' });
        expect(matches.map((m) => m.id)).toEqual(['apify:facebook-marketplace:1']);
        expect(stats.relayed).toBe(1);
        expect(sent).toHaveLength(1);
        expect(sent[0].url).toBe('https://api.resend.com/emails');
        expect(sent[0].body.to).toEqual(['sales@urbanstone.co']);
        expect(JSON.stringify(sent[0].body)).not.toContain('Seller Name');
        expect(sent.some((s) => s.url.includes('hooks.example.invalid'))).toBe(false);
    } finally {
        global.fetch = savedFetch;
        log.mockRestore();
    }
});
