import { resolveRunMode, runModeFlags, sourceIsActive } from '../src/mode.js';
import { buildPreDraft, shouldRunDaily, resolveCooldownHours } from '../src/daily-runner.js';

describe('daily automation helpers', () => {
    test('accepts dry alias for dry-run mode', () => {
        expect(resolveRunMode(['--mode=dry'])).toBe('dry-run');
    });

    test('defaults to review-only so an unspecific run cannot relay externally', () => {
        const mode = resolveRunMode([], { LEAD_SOURCER_MODE: '' });
        expect(mode).toBe('review-only');
        expect(runModeFlags(mode).shouldRelay).toBe(false);
    });

    test('a one-county run leaves the other enabled sources idle', () => {
        const butler = { key: 'permits-butler', enabled: true };
        const hamilton = { key: 'permits-hamilton', enabled: true };
        expect(sourceIsActive(butler, 'permits-butler')).toBe(true);
        expect(sourceIsActive(hamilton, 'permits-butler')).toBe(false);
        expect(sourceIsActive(hamilton, '')).toBe(true);
        expect(sourceIsActive({ key: 'permits-butler', enabled: false }, 'permits-butler')).toBe(false);
    });

    test('creates a usable pre-draft from a lead payload', () => {
        const draft = buildPreDraft({
            source: 'reddit',
            lead: {
                name: 'Sam',
                email: 'sam@example.com',
                phone: '+1-513-555-1212',
                externalPostUrl: 'https://example.com/post',
                projectDetails: 'Need granite countertop quote for kitchen remodel.',
            },
            metadata: {
                routeId: 'lead-sourcer/reddit',
                requestId: 'lead-sourcer/reddit/123',
            },
        });

        expect(draft.subject).toContain('Lead Draft');
        expect(draft.text).toContain('Sam');
        expect(draft.html).toContain('granite countertop quote');
    });

    test('blocks scheduling when the last run was recent', () => {
        const now = new Date('2026-09-20T12:00:00Z');
        const state = {
            lastRunAt: new Date('2026-09-20T11:50:00Z').toISOString(),
            lastStatus: 'success',
        };

        expect(shouldRunDaily(state, now)).toBe(false);
    });

    test('force overrides the cooldown only when explicitly set', () => {
        const now = new Date('2026-09-20T12:00:00Z');
        const state = { lastRunAt: new Date('2026-09-20T11:50:00Z').toISOString(), lastStatus: 'success' };

        expect(shouldRunDaily(state, now, { force: true })).toBe(true);
        expect(shouldRunDaily(state, now, { force: false })).toBe(false);
        expect(shouldRunDaily(state, now, {})).toBe(false);
    });

    test('default 3h cooldown lets the 8 AM / 12 PM / 5 PM slots all run', () => {
        const state = { lastRunAt: '2026-10-29T12:10:00Z', lastStatus: 'success' };
        expect(shouldRunDaily(state, new Date('2026-10-29T16:00:00Z'))).toBe(true);
        expect(shouldRunDaily(state, new Date('2026-10-29T14:00:00Z'))).toBe(false);
        expect(shouldRunDaily(state, new Date('2026-10-29T16:00:00Z'), { cooldownHours: 24 })).toBe(false);
        expect(resolveCooldownHours(undefined)).toBe(3);
        expect(resolveCooldownHours('6')).toBe(6);
        expect(resolveCooldownHours('abc')).toBe(3);
    });
});
