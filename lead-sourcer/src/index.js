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
import { initializeTracing } from './tracing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_LOG_FILE = process.env.LEAD_SOURCER_RUN_LOG_FILE || path.resolve(__dirname, '..', 'runs', 'poll-runs.jsonl');
const INTERVAL_MINUTES = Number(process.env.LEAD_SOURCER_INTERVAL_MINUTES || 0);
const MAX_CYCLES = Number(process.env.LEAD_SOURCER_MAX_CYCLES || 0);
const ZERO_MATCH_ALERT_THRESHOLD = Number(process.env.LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD || 0);
const SEND_RUN_REPORT = !['0', 'false', 'no', 'off'].includes(String(process.env.LEAD_SOURCER_SEND_RUN_REPORT || 'true').trim().toLowerCase());

function envFlag(name, defaultValue = true) {
    const raw = String(process.env[name] || '').trim().toLowerCase();
    if (!raw) return defaultValue;
    return !['0', 'false', 'no', 'off'].includes(raw);
}

const ENABLE_REDDIT = envFlag('LEAD_SOURCER_ENABLE_REDDIT', true);
const ENABLE_CRAIGSLIST = envFlag('LEAD_SOURCER_ENABLE_CRAIGSLIST', true);
const ENABLE_APIFY = envFlag('LEAD_SOURCER_ENABLE_APIFY', true);

await initializeTracing();

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

function buildRunReportHtml(summary) {
    const reddit = summary.verdicts?.reddit || {};
    const craigslist = summary.verdicts?.craigslist || {};
    const apify = summary.verdicts?.apify || {};

    const redditMatches = safeStat(reddit, 'matches');
    const clMatches = safeStat(craigslist, 'matches');
    const apifyMatches = safeStat(apify, 'matches');
    const totalMatches = redditMatches + clMatches + apifyMatches;

    const redditFetched = safeStat(reddit, 'fetched');
    const clFetched = safeStat(craigslist, 'fetched');
    const apifyFetched = safeStat(apify, 'fetched');
    const totalFetched = redditFetched + clFetched + apifyFetched;

    // Helper to create a bar chart
    function renderBar(label, value, max) {
        if (max === 0) return `<div style="margin: 8px 0; font-size: 13px;"><strong>${label}:</strong> ${value}</div>`;
        const percentage = Math.round((value / max) * 100);
        const barWidth = Math.max(1, Math.round(percentage * 2));
        return `<div style="margin: 8px 0;"><strong>${label}:</strong> ${value}<div style="background: #e0e0e0; height: 20px; margin-top: 4px; border-radius: 3px; overflow: hidden;"><div style="background: #2196F3; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div></div></div>`;
    }

    const durationMs = new Date(summary.completedAt) - new Date(summary.startedAt);
    const durationSec = (durationMs / 1000).toFixed(1);

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Lead Sourcer Run Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
        .metric-value { font-size: 32px; font-weight: bold; color: #333; }
        .metric-label { font-size: 12px; color: #999; text-transform: uppercase; margin-top: 8px; }
        .source-section { margin-bottom: 30px; }
        .source-section h2 { font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
        .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; font-size: 13px; }
        .stat { background: #f5f5f5; padding: 10px; border-radius: 4px; }
        .stat strong { color: #667eea; }
        .footer { background: #f9f9f9; padding: 20px 30px; border-radius: 0 0 8px 8px; font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; }
        .match-highlight { padding: 15px; background: ${totalMatches > 0 ? '#e8f5e9' : '#fff3e0'}; border-left: 4px solid ${totalMatches > 0 ? '#4caf50' : '#ff9800'}; border-radius: 4px; margin-bottom: 20px; }
        .match-highlight p { margin: 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Lead Sourcer Run Report</h1>
            <p>Automated lead sourcing from Reddit, Craigslist, and Apify</p>
        </div>
        <div class="content">
            <div class="match-highlight">
                <p><strong>🎯 Total Matches Found: ${totalMatches}</strong> (${durationSec}s)</p>
            </div>

            <div class="summary-grid">
                <div class="metric-card">
                    <div class="metric-label">Total Items Fetched</div>
                    <div class="metric-value">${totalFetched}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Total Matches</div>
                    <div class="metric-value" style="color: ${totalMatches > 0 ? '#4caf50' : '#999'};">${totalMatches}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Total Relayed</div>
                    <div class="metric-value" style="color: ${summary.counts.totalMatches > 0 ? '#2196f3' : '#999'};">${summary.counts.totalMatches}</div>
                </div>
            </div>

            <div class="source-section">
                <h2>📱 Reddit</h2>
                <div class="stats-row">
                    <div class="stat"><strong>Fetched:</strong> ${redditFetched}</div>
                    <div class="stat"><strong>Matches:</strong> ${redditMatches}</div>
                </div>
                <div class="stats-row">
                    <div class="stat"><strong>Relayed:</strong> ${safeStat(reddit, 'relayed')}</div>
                    <div class="stat"><strong>Rejects:</strong> ${safeStat(reddit, 'rejects')}</div>
                </div>
            </div>

            <div class="source-section">
                <h2>🏷️ Craigslist</h2>
                <div class="stats-row">
                    <div class="stat"><strong>Fetched:</strong> ${clFetched}</div>
                    <div class="stat"><strong>Matches:</strong> ${clMatches}</div>
                </div>
                <div class="stats-row">
                    <div class="stat"><strong>Relayed:</strong> ${safeStat(craigslist, 'relayed')}</div>
                    <div class="stat"><strong>Rejects:</strong> ${safeStat(craigslist, 'rejects')}</div>
                </div>
            </div>

            <div class="source-section">
                <h2>🤖 Apify</h2>
                <div class="stats-row">
                    <div class="stat"><strong>Fetched:</strong> ${apifyFetched}</div>
                    <div class="stat"><strong>Matches:</strong> ${apifyMatches}</div>
                </div>
                <div class="stats-row">
                    <div class="stat"><strong>Relayed:</strong> ${safeStat(apify, 'relayed')}</div>
                    <div class="stat"><strong>Rejects:</strong> ${safeStat(apify, 'rejects')}</div>
                </div>
            </div>

            ${Array.isArray(summary.errors) && summary.errors.length > 0 ? `
            <div class="source-section" style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #f44336;">⚠️ Errors</h3>
                ${summary.errors.map(err => `<p style="margin: 5px 0; font-size: 13px;"><strong>${err.source}:</strong> ${err.message}</p>`).join('')}
            </div>
            ` : ''}
        </div>
        <div class="footer">
            <p><strong>Run Window:</strong> ${new Date(summary.startedAt).toLocaleString()} → ${new Date(summary.completedAt).toLocaleString()}</p>
            <p><strong>Mode:</strong> ${summary.mode} | <strong>Duration:</strong> ${durationSec}s</p>
            <p>Lead Sourcer v1.0</p>
        </div>
    </div>
</body>
</html>`;

    return html;
}

async function maybeSendRunReport(summary) {
    if (!SEND_RUN_REPORT || summary.mode !== 'live') return;

    const reportId = `run-report:${summary.startedAt}`;
    const htmlReport = buildRunReportHtml(summary);
    const textReport = buildRunReportDetails(summary);

    const payload = {
        submittedAt: summary.completedAt,
        source: 'lead-sourcer-run-report',
        lead: {
            name: 'Lead Sourcer Run Report',
            email: null,
            phone: null,
            projectDetails: textReport,
            htmlReport,
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

    if (!ENABLE_REDDIT) console.log('[lead-sourcer] Reddit poller disabled (LEAD_SOURCER_ENABLE_REDDIT=false).');
    if (!ENABLE_CRAIGSLIST) console.log('[lead-sourcer] Craigslist poller disabled (LEAD_SOURCER_ENABLE_CRAIGSLIST=false).');
    if (!ENABLE_APIFY) console.log('[lead-sourcer] Apify poller disabled (LEAD_SOURCER_ENABLE_APIFY=false).');

    const [redditMatches, craigslistMatches, apifyMatches] = await Promise.allSettled([
        ENABLE_REDDIT ? pollReddit({ mode }) : Promise.resolve({ matches: [], stats: {} }),
        ENABLE_CRAIGSLIST ? pollCraigslist({ mode }) : Promise.resolve({ matches: [], stats: {} }),
        ENABLE_APIFY ? pollApify({ mode }) : Promise.resolve({ matches: [], stats: {} }),
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
