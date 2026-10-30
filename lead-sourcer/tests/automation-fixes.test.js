import { jest } from '@jest/globals';
import { deliverLead } from '../src/relay.js';
import { assessRunHealth } from '../src/run-health.js';

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
            sourceStatuses: { 'permits-hamilton': 'degraded', permits: 'parse-error', 'permits-butler': 'disabled' },
            errors: [],
        }, { 'permits-hamilton': true, permits: true, 'permits-butler': false });
        expect(health).toEqual({ enabledCount: 2, unhealthySources: ['permits-hamilton', 'permits'], allFailed: true });
    });

    test('healthy run when enabled sources are ok', () => {
        const health = assessRunHealth({
            sourceStatuses: { 'permits-hamilton': 'ok', permits: 'ok', 'permits-butler': 'disabled' },
            errors: [],
        }, { 'permits-hamilton': true, permits: true, 'permits-butler': false });
        expect(health.unhealthySources).toEqual([]);
        expect(health.allFailed).toBe(false);
    });

    test('retired sources (Reddit, Craigslist, Apify) never count, even if a stale flag says enabled', () => {
        const health = assessRunHealth({
            sourceStatuses: { reddit: 'degraded', craigslist: 'parse-error', apify: 'error', 'permits-hamilton': 'ok' },
            errors: [{ source: 'apify', message: 'boom' }],
        }, { reddit: true, craigslist: true, apify: true, 'permits-hamilton': true });
        expect(health).toEqual({ enabledCount: 1, unhealthySources: [], allFailed: false });
    });
});
