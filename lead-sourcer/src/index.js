/**
 * Main entry point — runs all pollers once, or on a configured interval.
 * Default behavior remains one-shot; interval mode is opt-in.
 *
 * Usage:
 *   LEAD_WEBHOOK_URL=https://hooks.zapier.com/... node src/index.js
 *
 * Or add to a cron job:
 *   0 * * * * cd /path/to/lead-sourcer && LEAD_WEBHOOK_URL=... node src/index.js >> logs/poller.log 2>&1
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pollReddit } from './reddit.js';
import { pollCraigslist } from './craigslist.js';
import { pollApify } from './apify.js';
import { resolveRunMode } from './mode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_LOG_FILE = process.env.LEAD_SOURCER_RUN_LOG_FILE || path.resolve(__dirname, '..', 'runs', 'poll-runs.jsonl');
const INTERVAL_MINUTES = Number(process.env.LEAD_SOURCER_INTERVAL_MINUTES || 0);
const MAX_CYCLES = Number(process.env.LEAD_SOURCER_MAX_CYCLES || 0);
const ZERO_MATCH_ALERT_THRESHOLD = Number(process.env.LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD || 0);

function delay(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function appendRunSummary(summary) {
    const record = `${JSON.stringify(summary)}\n`;
    await fs.mkdir(path.dirname(RUN_LOG_FILE), { recursive: true });
    await fs.appendFile(RUN_LOG_FILE, record, 'utf8');
}

async function runOnce(mode) {
    const startedAt = new Date();
    console.log(`[lead-sourcer] Starting poll at ${startedAt.toISOString()} (mode=${mode})`);

    const [redditMatches, craigslistMatches, apifyMatches] = await Promise.allSettled([
        pollReddit({ mode }),
        pollCraigslist({ mode }),
        pollApify({ mode }),
    ]);

    const redditCount = redditMatches.status === 'fulfilled' ? redditMatches.value.length : 0;
    const clCount = craigslistMatches.status === 'fulfilled' ? craigslistMatches.value.length : 0;
    const apifyCount = apifyMatches.status === 'fulfilled' ? apifyMatches.value.length : 0;

    const errors = [];
    if (redditMatches.status === 'rejected') {
        console.error('[lead-sourcer] Reddit poller error:', redditMatches.reason);
        errors.push({ source: 'reddit', message: String(redditMatches.reason?.message || redditMatches.reason) });
    }
    if (craigslistMatches.status === 'rejected') {
        console.error('[lead-sourcer] Craigslist poller error:', craigslistMatches.reason);
        errors.push({ source: 'craigslist', message: String(craigslistMatches.reason?.message || craigslistMatches.reason) });
    }
    if (apifyMatches.status === 'rejected') {
        console.error('[lead-sourcer] Apify poller error:', apifyMatches.reason);
        errors.push({ source: 'apify', message: String(apifyMatches.reason?.message || apifyMatches.reason) });
    }

    const totalMatches = redditCount + clCount + apifyCount;
    console.log(`[lead-sourcer] Poll complete — Reddit: ${redditCount} match(es), Craigslist: ${clCount} match(es), Apify: ${apifyCount} match(es), mode=${mode}`);

    const summary = {
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        mode,
        counts: {
            reddit: redditCount,
            craigslist: clCount,
            apify: apifyCount,
            totalMatches,
        },
        errors,
    };

    await appendRunSummary(summary);
    return summary;
}

async function run() {
    const mode = resolveRunMode();
    const useInterval = Number.isFinite(INTERVAL_MINUTES) && INTERVAL_MINUTES > 0;

    if (!useInterval) {
        await runOnce(mode);
        return;
    }

    console.log(`[lead-sourcer] Interval mode enabled: every ${INTERVAL_MINUTES} minute(s)`);
    let cycle = 0;
    let zeroMatchStreak = 0;

    while (MAX_CYCLES <= 0 || cycle < MAX_CYCLES) {
        cycle += 1;
        const cycleStarted = Date.now();
        const summary = await runOnce(mode);

        if (summary.counts.totalMatches === 0) {
            zeroMatchStreak += 1;
            if (ZERO_MATCH_ALERT_THRESHOLD > 0 && zeroMatchStreak >= ZERO_MATCH_ALERT_THRESHOLD) {
                console.warn(`[lead-sourcer] Alert: ${zeroMatchStreak} consecutive zero-match cycles (threshold=${ZERO_MATCH_ALERT_THRESHOLD})`);
            }
        } else {
            zeroMatchStreak = 0;
        }

        const elapsedMs = Date.now() - cycleStarted;
        const waitMs = INTERVAL_MINUTES * 60_000 - elapsedMs;
        await delay(waitMs);
    }
}

run().catch((err) => {
    console.error('[lead-sourcer] Fatal error:', err);
    process.exitCode = 1;
});
