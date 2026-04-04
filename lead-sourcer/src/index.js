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
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pollReddit } from './reddit.js';
import { pollCraigslist } from './craigslist.js';
import { pollApify } from './apify.js';
import { resolveRunMode } from './mode.js';
import { relay } from './relay.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_LOG_FILE = process.env.LEAD_SOURCER_RUN_LOG_FILE || path.resolve(__dirname, '..', 'runs', 'poll-runs.jsonl');
const INTERVAL_MINUTES = Number(process.env.LEAD_SOURCER_INTERVAL_MINUTES || 0);
const MAX_CYCLES = Number(process.env.LEAD_SOURCER_MAX_CYCLES || 0);
const ZERO_MATCH_ALERT_THRESHOLD = Number(process.env.LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD || 0);
const SEND_RUN_REPORT = !['0', 'false', 'no', 'off'].includes(String(process.env.LEAD_SOURCER_SEND_RUN_REPORT || 'true').trim().toLowerCase());

function delay(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function appendRunSummary(summary) {
    const record = `${JSON.stringify(summary)}\n`;
    await fs.mkdir(path.dirname(RUN_LOG_FILE), { recursive: true });
    await fs.appendFile(RUN_LOG_FILE, record, 'utf8');
}

function normalizePollResult(result) {
    // Some pollers may return [] on skip paths; normalize to a stable shape.
    if (Array.isArray(result)) {
        return { matches: result, stats: {} };
    }

    if (result && Array.isArray(result.matches)) {
        return {
            matches: result.matches,
            stats: result.stats || {},
        };
    }

    return { matches: [], stats: {} };
}

function safeStat(stats, key) {
    const value = stats?.[key];
    return Number.isFinite(value) ? value : 0;
}

function buildRunReportDetails(summary) {
    const reddit = summary.verdicts?.reddit || {};
    const craigslist = summary.verdicts?.craigslist || {};
    const apify = summary.verdicts?.apify || {};

    const lines = [
        '[LEAD SOURCER RUN REPORT]',
        '',
        `Run window: ${summary.startedAt} -> ${summary.completedAt}`,
        `Mode: ${summary.mode}`,
        '',
        `Counts: reddit=${summary.counts.reddit}, craigslist=${summary.counts.craigslist}, apify=${summary.counts.apify}, totalMatches=${summary.counts.totalMatches}`,
        '',
        `Reddit: fetched=${safeStat(reddit, 'fetched')}, evaluated=${safeStat(reddit, 'evaluated')}, matches=${safeStat(reddit, 'matches')}, borderline=${safeStat(reddit, 'borderline')}, rejects=${safeStat(reddit, 'rejects')}, relayed=${safeStat(reddit, 'relayed')}`,
        `Craigslist: fetched=${safeStat(craigslist, 'fetched')}, evaluated=${safeStat(craigslist, 'evaluated')}, bodyFetches=${safeStat(craigslist, 'bodyFetches')}, matches=${safeStat(craigslist, 'matches')}, borderline=${safeStat(craigslist, 'borderline')}, rejects=${safeStat(craigslist, 'rejects')}, relayed=${safeStat(craigslist, 'relayed')}`,
        `Apify: fetched=${safeStat(apify, 'fetched')}, evaluated=${safeStat(apify, 'evaluated')}, matches=${safeStat(apify, 'matches')}, borderline=${safeStat(apify, 'borderline')}, rejects=${safeStat(apify, 'rejects')}, relayed=${safeStat(apify, 'relayed')}`,
    ];

    if (Array.isArray(summary.errors) && summary.errors.length > 0) {
        lines.push('', `Errors: ${summary.errors.map((error) => `${error.source}:${error.message}`).join(' | ')}`);
    }

    lines.push('', `Run log file: ${RUN_LOG_FILE}`);
    return lines.join('\n');
}

async function maybeSendRunReport(summary) {
    if (!SEND_RUN_REPORT || summary.mode !== 'live') return;

    const reportId = `run-report:${summary.startedAt}`;
    const payload = {
        submittedAt: summary.completedAt,
        source: 'lead-sourcer-run-report',
        lead: {
            name: 'Lead Sourcer Run Report',
            email: null,
            phone: null,
            projectDetails: buildRunReportDetails(summary),
            externalPostId: reportId,
            externalPostUrl: null,
        },
        metadata: {
            requestId: `lead-sourcer/report/${reportId}`,
            routeId: 'lead-sourcer/report',
            dedupeKey: reportId,
            automated: true,
        },
    };

    try {
        await relay(payload);
        console.log(`[lead-sourcer] Run report relayed for ${summary.startedAt}`);
    } catch (error) {
        console.warn('[lead-sourcer] Failed to relay run report:', error?.message || error);
    }
}

async function runOnce(mode) {
    const startedAt = new Date();
    console.log(`[lead-sourcer] Starting poll at ${startedAt.toISOString()} (mode=${mode})`);

    const [redditMatches, craigslistMatches, apifyMatches] = await Promise.allSettled([
        pollReddit({ mode }),
        pollCraigslist({ mode }),
        pollApify({ mode }),
    ]);

    const redditResult = redditMatches.status === 'fulfilled'
        ? normalizePollResult(redditMatches.value)
        : { matches: [], stats: {} };
    const craigslistResult = craigslistMatches.status === 'fulfilled'
        ? normalizePollResult(craigslistMatches.value)
        : { matches: [], stats: {} };
    const apifyResult = apifyMatches.status === 'fulfilled'
        ? normalizePollResult(apifyMatches.value)
        : { matches: [], stats: {} };

    const redditCount = redditResult.matches.length;
    const clCount = craigslistResult.matches.length;
    const apifyCount = apifyResult.matches.length;

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
    console.log('[lead-sourcer] Verdict stats', {
        reddit: redditResult.stats,
        craigslist: craigslistResult.stats,
        apify: apifyResult.stats,
    });

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
        verdicts: {
            reddit: redditResult.stats,
            craigslist: craigslistResult.stats,
            apify: apifyResult.stats,
        },
        errors,
    };

    await appendRunSummary(summary);
    await maybeSendRunReport(summary);
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
