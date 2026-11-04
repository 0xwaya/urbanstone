import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildKentonLead,
    buildKentonQueryUrl,
    evaluateKentonPermit,
    getKentonConfig,
    isKentonPermitsEnabled,
    normalizeKentonFeature,
    pollKentonPermits,
} from '../src/permits-kenton.js';
import { buildCrmIntake } from '../src/crm-sync.js';
import { assessRunHealth } from '../src/run-health.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const data = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'kenton-features.json'), 'utf8'));
const NOW = new Date('2026-10-29T12:00:00Z');

const jsonResponse = (body, status = 200) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
function memoryDedup(initial = []) {
    const seen = new Set(initial);
    return { seen, isSeen: (id) => seen.has(id), markSeen: (id) => seen.add(id) };
}
const harness = (over = {}) => ({ env: {}, now: NOW, logReview: () => {}, relayFn: jest.fn(async () => ({})), ...memoryDedup(), fetchImpl: jest.fn(async () => jsonResponse(data)), ...over });

describe('kenton switch', () => {
    test('is off by default and only on for truthy values', () => {
        expect(isKentonPermitsEnabled({})).toBe(false);
        expect(isKentonPermitsEnabled({ LEAD_SOURCER_ENABLE_PERMITS_KENTON: 'false' })).toBe(false);
        expect(isKentonPermitsEnabled({ LEAD_SOURCER_ENABLE_PERMITS_KENTON: 'true' })).toBe(true);
    });
});

describe('kenton query and parsing', () => {
    test('query covers the lookback window on the ArcGIS layer', () => {
        const url = new URL(buildKentonQueryUrl({ lookbackDays: 14, now: NOW }));
        expect(url.pathname).toMatch(/DevTracking_Permits_KC_Processing\/FeatureServer\/0\/query$/);
        expect(url.searchParams.get('where')).toBe("PERMIT_DAT >= DATE '2026-10-15'");
        expect(url.searchParams.get('f')).toBe('json');
    });

    test('normalizes a feature: permit number from COMMENT, trimmed address, new-home description', () => {
        const p = normalizeKentonFeature(data.features[0]);
        expect(p).toMatchObject({ permitNumber: '20263001', address: '1400 TEST WAY', municipality: 'Unincorporated', developer: 'Sample Homes LLC', issuedAt: '2026-10-21' });
        expect(p.description).toBe('New single family home, 4 bedroom, in Stonewater');
        expect(normalizeKentonFeature(data.features[1]).description).toBe('New single family home, 3 bedroom');
    });

    test('keeps residential and multi-family, rejects commercial by default', () => {
        const config = getKentonConfig({});
        const verdicts = data.features.map((f) => evaluateKentonPermit(normalizeKentonFeature(f), config).reason);
        expect(verdicts).toEqual(['match', 'match', 'excluded-type', 'match']);
    });
});

describe('kenton lead payload', () => {
    test('internal-only payload maps cleanly into the CRM intake as KY', () => {
        const payload = buildKentonLead(normalizeKentonFeature(data.features[0]));
        expect(payload.metadata.internalOnly).toBe(true);
        expect(payload.lead.email).toBe('');
        expect(payload.metadata.permit.address).toBe('1400 TEST WAY, Unincorporated, KY');
        const body = buildCrmIntake(payload, 'permits-kenton');
        expect(body.intake).toMatchObject({ sub_source: 'permit_kenton', source_ref: '20263001', project_state: 'KY', valuation: null });
    });

    test('new home scores on scope, apartment on multi-family', () => {
        const home = buildKentonLead(normalizeKentonFeature(data.features[1]));
        expect(home.metadata.scoreReasons[0]).toBe('scope:new-home +25');
        const flats = buildKentonLead(normalizeKentonFeature(data.features[3]));
        expect(flats.metadata.scoreReasons[0]).toBe('scope:apartment +30');
    });
});

describe('pollKentonPermits', () => {
    test('dry-run matches without relaying or persisting seen ids', async () => {
        const h = harness();
        const { matches, stats } = await pollKentonPermits({ mode: 'dry-run', ...h });
        expect(matches.map((m) => m.metadata.permitNumber)).toEqual(['20263001', '20263002', '20263004']);
        expect(stats).toMatchObject({ status: 'ok', fetched: 4, matches: 3, rejects: 1, relayed: 0 });
        expect(h.relayFn).not.toHaveBeenCalled();
        expect(h.seen.size).toBe(0);
    });

    test('seen permits are skipped', async () => {
        const h = harness(memoryDedup(['kenton:20263001']));
        const { stats } = await pollKentonPermits({ mode: 'dry-run', ...harness(), isSeen: h.isSeen, markSeen: h.markSeen });
        expect(stats.skippedSeen).toBe(1);
    });

    test('a layer outage degrades the source instead of throwing', async () => {
        const down = harness({ fetchImpl: jest.fn(async () => { throw new Error('network down'); }) });
        const result = await pollKentonPermits({ mode: 'live', ...down });
        expect(result.stats.status).toBe('degraded');
        expect(result.matches).toEqual([]);
        const errored = harness({ fetchImpl: jest.fn(async () => jsonResponse({ error: { code: 400, message: 'Invalid query' } })) });
        expect((await pollKentonPermits({ mode: 'live', ...errored })).stats.status).toBe('degraded');
        const health = assessRunHealth({ sourceStatuses: { 'permits-kenton': 'degraded' } }, { 'permits-kenton': true });
        expect(health.unhealthySources).toEqual(['permits-kenton']);
    });
});
