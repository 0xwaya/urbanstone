// Weekday guard for GitHub Actions schedule runs.
//
// The workflow cron is interpreted in America/New_York (on.schedule.timezone),
// weekdays only, at :07. This guard is the backstop: a scheduled run that
// actually starts on Saturday or Sunday does not poll. Manual dispatch still runs.
// The hour field is the New York hour, not UTC.

export const DEFAULT_SCHEDULE_TZ = 'America/New_York';
export const DEFAULT_SCHEDULE_HOURS = [8, 12, 17];
const WEEKEND = new Set(['Sat', 'Sun']);

export function parseAllowedHours(value) {
    if (value === undefined || value === null || String(value).trim() === '') return DEFAULT_SCHEDULE_HOURS;
    const hours = String(value).split(',').map((h) => Number(h.trim())).filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);
    return hours.length ? hours : DEFAULT_SCHEDULE_HOURS;
}

export function cronUtcHour(cron) {
    const parts = String(cron || '').trim().split(/\s+/);
    if (parts.length < 5) return null;
    const hour = Number(parts[1]);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function etParts(now, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        hourCycle: 'h23',
        weekday: 'short',
    }).formatToParts(now);
    const value = (type) => parts.find((part) => part.type === type)?.value;
    return { hour: Number(value('hour')), weekday: value('weekday') || '' };
}

/**
 * Returns { run, reason, localHour, weekday }. Non-schedule events always proceed.
 * localHour is the hour field of the cron line (New York time when timezone is set).
 */
export function checkScheduledSlot({ eventName, cron, allowedHours = DEFAULT_SCHEDULE_HOURS, now = new Date(), timeZone = DEFAULT_SCHEDULE_TZ } = {}) {
    if (eventName !== 'schedule' || !cron) return { run: true, reason: 'not-a-scheduled-run', localHour: null, weekday: null };
    const localHour = cronUtcHour(cron);
    const { weekday } = etParts(now, timeZone);
    if (WEEKEND.has(weekday)) return { run: false, reason: 'weekend', localHour, weekday };
    if (localHour === null || !allowedHours.includes(localHour)) {
        return { run: false, reason: 'off-slot', localHour, weekday };
    }
    return { run: true, reason: 'allowed-slot', localHour, weekday };
}