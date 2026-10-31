import { checkScheduledSlot, cronUtcHour, parseAllowedHours } from '../src/schedule-guard.js';

const THURSDAY = new Date('2026-10-29T12:05:00Z');
const SATURDAY = new Date('2026-10-31T12:07:00Z');
const SUNDAY = new Date('2026-11-01T21:07:00Z');

describe('schedule guard (New York weekday slots)', () => {
    test('parses the cron hour and allowed hours', () => {
        expect(cronUtcHour('7 8 * * 1-5')).toBe(8);
        expect(cronUtcHour('bad')).toBeNull();
        expect(parseAllowedHours('')).toEqual([8, 12, 17]);
        expect(parseAllowedHours('9, 14')).toEqual([9, 14]);
    });

    test('weekday slots at 8, 12 and 17 run', () => {
        for (const cron of ['7 8 * * 1-5', '7 12 * * 1-5', '7 17 * * 1-5']) {
            expect(checkScheduledSlot({ eventName: 'schedule', cron, now: THURSDAY }).run).toBe(true);
        }
    });

    test('a cron hour outside the three slots does not run', () => {
        expect(checkScheduledSlot({ eventName: 'schedule', cron: '7 9 * * 1-5', now: THURSDAY })).toMatchObject({
            run: false, reason: 'off-slot',
        });
    });

    test('scheduled runs skip Saturday and Sunday', () => {
        expect(checkScheduledSlot({ eventName: 'schedule', cron: '7 8 * * 1-5', now: SATURDAY })).toMatchObject({
            run: false, reason: 'weekend', weekday: 'Sat',
        });
        expect(checkScheduledSlot({ eventName: 'schedule', cron: '7 17 * * 1-5', now: SUNDAY })).toMatchObject({
            run: false, reason: 'weekend', weekday: 'Sun',
        });
    });

    test('manual and local runs are never blocked, including on a weekend', () => {
        expect(checkScheduledSlot({ eventName: 'workflow_dispatch', cron: '', now: SATURDAY }).run).toBe(true);
        expect(checkScheduledSlot({ now: SUNDAY }).run).toBe(true);
    });
});
