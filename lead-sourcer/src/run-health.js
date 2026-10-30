/**
 * Decide whether a poll cycle was healthy. A source counts as unhealthy when it
 * is enabled and either threw or reported a non-ok status (degraded, parse-error).
 */
// Live sources are the permit feeds; Reddit, Craigslist and Apify were retired 2026-10-30.
const LIVE_SOURCES = ['permits-hamilton', 'permits', 'permits-butler'];

export function assessRunHealth(summary, enabled = {}) {
    const unhealthySources = [];
    let enabledCount = 0;
    for (const source of LIVE_SOURCES) {
        const status = summary.sourceStatuses?.[source] || 'unknown';
        if (enabled[source] === false || status === 'disabled') continue;
        // Permit sources are opt-in and only count when explicitly enabled.
        if (enabled[source] !== true) continue;
        enabledCount += 1;
        const errored = (summary.errors || []).some((error) => error.source === source);
        if (errored || status !== 'ok') unhealthySources.push(source);
    }
    return {
        enabledCount,
        unhealthySources,
        allFailed: enabledCount > 0 && unhealthySources.length === enabledCount,
    };
}
