import { resolveRunMode } from '../src/mode.js';
import { buildPreDraft, shouldRunDaily } from '../src/daily-runner.js';

describe('daily automation helpers', () => {
    test('accepts dry alias for dry-run mode', () => {
        expect(resolveRunMode(['--mode=dry'])).toBe('dry-run');
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
});
