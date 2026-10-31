// Time-of-day guard for GitHub Actions cron runs.
//
// GitHub cron is UTC-only, so the workflow lists the UTC hours for both EDT and
// EST (e.g. 12 and 13 UTC for 8 AM ET). Each scheduled run checks the cron line
// that triggered it (github.event.schedule) and only proceeds when that UTC hour
// maps to an allowed America/New_York hour on a weekday. Using the cron line
// instead of the wall clock keeps the guard correct when GitHub starts a run late.
// Saturday and Sunday are skipped even if a cron line still fires.

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

function slotForUtcHour(utcHour, now, timeZone) {
    const slot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0));
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        hourCycle: 'h23',
        weekday: 'short',
    }).formatToParts(slot);
    const value = (type) => parts.find((part) => part.type === type)?.value;
    return { hour: Number(value('hour')), weekday: value('weekday') || '' };
}

export function localHourForUtcHour(utcHour, now = new Date(), timeZone = DEFAULT_SCHEDULE_TZ) {
    return slotForUtcHour(utcHour, now, timeZone).hour;
}

/**
 * Returns { run, reason, localHour, weekday }. Non-schedule events (manual
 * dispatch, local runs) and runs without a cron line always proceed, including
 * on a weekend.
 */
export function checkScheduledSlot({ eventName, cron, allowedHours = DEFAULT_SCHEDULE_HOURS, now = new Date(), timeZone = DEFAULT_SCHEDULE_TZ } = {}) {
    if (eventName !== 'schedule' || !cron) return { run: true, reason: 'not-a-scheduled-run', localHour: null, weekday: null };
    const utcHour = cronUtcHour(cron);
    if (utcHour === null) return { run: true, reason: 'unparsed-cron', localHour: null, weekday: null };
    const { hour: localHour, weekday } = slotForUtcHour(utcHour, now, timeZone);
    if (WEEKEND.has(weekday)) return { run: false, reason: 'weekend', localHour, weekday };
    return allowedHours.includes(localHour)
        ? { run: true, reason: 'allowed-slot', localHour, weekday }
        : { run: false, reason: 'off-slot (other DST variant)', localHour, weekday };
}