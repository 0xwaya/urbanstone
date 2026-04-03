/**
 * Main entry point — runs both pollers sequentially.
 * Can be invoked manually or scheduled via cron.
 *
 * Usage:
 *   LEAD_WEBHOOK_URL=https://hooks.zapier.com/... node src/index.js
 *
 * Or add to a cron job:
 *   0 * * * * cd /path/to/lead-sourcer && LEAD_WEBHOOK_URL=... node src/index.js >> logs/poller.log 2>&1
 */
import { pollReddit } from './reddit.js';
import { pollCraigslist } from './craigslist.js';
import { pollApify } from './apify.js';
import { resolveRunMode } from './mode.js';

async function run() {
    const mode = resolveRunMode();
    console.log(`[lead-sourcer] Starting poll at ${new Date().toISOString()} (mode=${mode})`);

    const [redditMatches, craigslistMatches, apifyMatches] = await Promise.allSettled([
        pollReddit({ mode }),
        pollCraigslist({ mode }),
        pollApify({ mode }),
    ]);

    const redditCount = redditMatches.status === 'fulfilled' ? redditMatches.value.length : 0;
    const clCount = craigslistMatches.status === 'fulfilled' ? craigslistMatches.value.length : 0;
    const apifyCount = apifyMatches.status === 'fulfilled' ? apifyMatches.value.length : 0;

    if (redditMatches.status === 'rejected') {
        console.error('[lead-sourcer] Reddit poller error:', redditMatches.reason);
    }
    if (craigslistMatches.status === 'rejected') {
        console.error('[lead-sourcer] Craigslist poller error:', craigslistMatches.reason);
    }
    if (apifyMatches.status === 'rejected') {
        console.error('[lead-sourcer] Apify poller error:', apifyMatches.reason);
    }

    console.log(`[lead-sourcer] Poll complete — Reddit: ${redditCount} match(es), Craigslist: ${clCount} match(es), Apify: ${apifyCount} match(es), mode=${mode}`);
}

run().catch((err) => {
    console.error('[lead-sourcer] Fatal error:', err);
    process.exitCode = 1;
});
