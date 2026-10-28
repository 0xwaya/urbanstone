/**
 * Decide whether a poll cycle was healthy. A source counts as unhealthy when it
 * is enabled and either threw or reported a non-ok status (degraded, parse-error).
 */
export function assessRunHealth(summary, enabled = {}) {
    const unhealthySources = [];
    let enabledCount = 0;
    for (const source of ['reddit', 'craigslist', 'apify']) {
        const status = summary.sourceStatuses?.[source] || 'unknown';
        if (enabled[source] === false || status === 'disabled') continue;
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
