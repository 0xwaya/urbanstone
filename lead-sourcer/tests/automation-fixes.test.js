import { jest } from '@jest/globals';
import { countResultMarkers, extractCraigslistPostId, parseResultsFromHtml } from '../src/craigslist.js';
import { deliverLead } from '../src/relay.js';
import { assessRunHealth } from '../src/run-health.js';

const CURRENT_CL_HTML = `
<ol class="cl-static-search-results">
  <li class="cl-static-search-result" title="Need granite countertop installed">
    <a href="https://www.craigslist.org/view/d/fairfield-need-granite-countertop/r3AUappUGQafRP9tWBnvTL">
      <div class="title">Need granite countertop installed</div>
    </a>
  </li>
  <li class="cl-static-search-result" title="Kitchen remodel help &amp; quote">
    <a href="https://cincinnati.craigslist.org/lbg/d/mason-kitchen-remodel/7801234567.html">
      <div class="title">Kitchen remodel help</div>
    </a>
  </li>
</ol>`;

describe('craigslist parser (2026 markup)', () => {
    test('parses new /view/d/ listing URLs and legacy .html URLs', () => {
        const results = parseResultsFromHtml(CURRENT_CL_HTML);
        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({ title: 'Need granite countertop installed', postId: 'r3AUappUGQafRP9tWBnvTL' });
        expect(results[1]).toMatchObject({ title: 'Kitchen remodel help & quote', postId: '7801234567' });
    });

    test('counts result markers so a markup change is detectable', () => {
        expect(countResultMarkers(CURRENT_CL_HTML)).toBe(2);
        expect(countResultMarkers('<html></html>')).toBe(0);
    });

    test('extracts stable ids', () => {
        expect(extractCraigslistPostId('https://www.craigslist.org/view/d/x-y/abcDEF123')).toBe('abcDEF123');
        expect(extractCraigslistPostId('https://cincinnati.craigslist.org/ggg/d/x/123.html')).toBe('123');
    });
});

describe('deliverLead', () => {
    test('marks seen only after a successful relay', async () => {
        const markSeen = jest.fn();
        const ok = await deliverLead({ dedupeKey: 'a' }, { postId: 'a', markSeen, stats: {}, relayFn: async () => ({}) });
        expect(ok).toBe(true);
        expect(markSeen).toHaveBeenCalledWith('a');
    });

    test('a failed relay does not throw, does not mark seen, and degrades stats', async () => {
        const markSeen = jest.fn();
        const stats = { status: 'ok' };
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const ok = await deliverLead({ dedupeKey: 'b' }, {
            postId: 'b', markSeen, stats, relayFn: async () => { throw new Error('Relay failed: resend: 401'); },
        });
        warn.mockRestore();
        expect(ok).toBe(false);
        expect(markSeen).not.toHaveBeenCalled();
        expect(stats).toMatchObject({ status: 'degraded', relayFailures: 1 });
    });
});

describe('assessRunHealth', () => {
    test('flags every enabled source failing', () => {
        const health = assessRunHealth({
            sourceStatuses: { reddit: 'degraded', craigslist: 'parse-error', apify: 'disabled' },
            errors: [],
        }, { reddit: true, craigslist: true, apify: true });
        expect(health).toEqual({ enabledCount: 2, unhealthySources: ['reddit', 'craigslist'], allFailed: true });
    });

    test('healthy run when enabled sources are ok', () => {
        const health = assessRunHealth({
            sourceStatuses: { reddit: 'disabled', craigslist: 'ok', apify: 'disabled' },
            errors: [],
        }, { reddit: false, craigslist: true, apify: false });
        expect(health.unhealthySources).toEqual([]);
        expect(health.allFailed).toBe(false);
    });
});
