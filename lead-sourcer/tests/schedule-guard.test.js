import { checkScheduledSlot, cronUtcHour, localHourForUtcHour, parseAllowedHours } from '../src/schedule-guard.js';

const EDT_DAY = new Date('2026-10-29T12:05:00Z');
const EST_DAY = new Date('2026-11-03T13:05:00Z');

describe('schedule guard (ET slots from UTC cron)', () => {
    test('parses the cron hour and allowed hours', () => {
        expect(cronUtcHour('0 16 * * *')).toBe(16);
        expect(cronUtcHour('bad')).toBeNull();
        expect(parseAllowedHours('')).toEqual([8, 12, 17]);
        expect(parseAllowedHours('9, 14')).toEqual([9, 14]);
    });

    test('maps UTC hours to New York hours across DST', () => {
        expect(localHourForUtcHour(12, EDT_DAY)).toBe(8);
        expect(localHourForUtcHour(13, EST_DAY)).toBe(8);
        expect(localHourForUtcHour(21, EDT_DAY)).toBe(17);
        expect(localHourForUtcHour(22, EST_DAY)).toBe(17);
    });

    test('runs only the cron line that matches ET today', () => {
        for (const cron of ['0 12 * * *', '0 16 * * *', '0 21 * * *']) {
            expect(checkScheduledSlot({ eventName: 'schedule', cron, now: EDT_DAY }).run).toBe(true);
            expect(checkScheduledSlot({ eventName: 'schedule', cron, now: EST_DAY }).run).toBe(false);
        }
        for (const cron of ['0 13 * * *', '0 17 * * *', '0 22 * * *']) {
            expect(checkScheduledSlot({ eventName: 'schedule', cron, now: EDT_DAY }).run).toBe(false);
            expect(checkScheduledSlot({ eventName: 'schedule', cron, now: EST_DAY }).run).toBe(true);
        }
    });

    test('a late-started run is judged by its cron line, not the clock', () => {
        const late = new Date('2026-10-29T13:40:00Z');
        expect(checkScheduledSlot({ eventName: 'schedule', cron: '0 12 * * *', now: late }).run).toBe(true);
    });

    test('scheduled runs skip Saturday and Sunday', () => {
        const saturday = new Date('2026-10-31T12:05:00Z');
        const sunday = new Date('2026-11-01T21:05:00Z');
        expect(checkScheduledSlot({ eventName: 'schedule', cron: '0 12 * * 1-5', now: saturday })).toMatchObject({
            run: false, reason: 'weekend', localHour: 8, weekday: 'Sat',
        });
        expect(checkScheduledSlot({ eventName: 'schedule', cron: '0 21 * * 1-5', now: sunday })).toMatchObject({
            run: false, reason: 'weekend', weekday: 'Sun',
        });
        expect(checkScheduledSlot({ eventName: 'workflow_dispatch', now: saturday }).run).toBe(true);
    });

    test('manual and local runs are never blocked', () => {
        expect(checkScheduledSlot({ eventName: 'workflow_dispatch', cron: '', now: EDT_DAY }).run).toBe(true);
        expect(checkScheduledSlot({}).run).toBe(true);
    });
});
