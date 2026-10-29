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
import { pollPermits, isPermitsEnabled } from './permits.js';
import { pollHamiltonPermits, pollButlerPermits, isHamiltonPermitsEnabled, isButlerPermitsEnabled } from './permits-accela.js';
import { resolveRunMode } from './mode.js';
import { relay } from './relay.js';
import { initializeTracing } from './tracing.js';
import { assessRunHealth } from './run-health.js';
import { buildRunReportText, buildRunReportHtml, summarizeLeadForReport, rankTopLeads } from './run-report.js';
import {
    APIFY_ENABLE_FB_MARKETPLACE,
    APIFY_FB_MARKETPLACE_TASK_ID,
    APIFY_FB_MARKETPLACE_MAX_CHARGE_USD,
    APIFY_FB_MARKETPLACE_CANARY_MAX_CHARGE_USD,
} from './config.js';
import { buildPreDraft, shouldRunDaily, readDailyState, writeDailyState, resolveCooldownHours } from './daily-runner.js';
import { checkScheduledSlot, parseAllowedHours } from './schedule-guard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RUN_LOG_FILE = process.env.LEAD_SOURCER_RUN_LOG_FILE || path.resolve(__dirname, '..', 'runs', 'poll-runs.jsonl');
const INTERVAL_MINUTES = Number(process.env.LEAD_SOURCER_INTERVAL_MINUTES || 0);
const MAX_CYCLES = Number(process.env.LEAD_SOURCER_MAX_CYCLES || 0);
const ZERO_MATCH_ALERT_THRESHOLD = Number(process.env.LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD || 0);
const SEND_RUN_REPORT = !['0', 'false', 'no', 'off'].includes(String(process.env.LEAD_SOURCER_SEND_RUN_REPORT || 'true').trim().toLowerCase());
const RUN_REPORT_EMAIL = String(process.env.LEAD_SOURCER_RUN_REPORT_EMAIL || 'sales@urbanstone.co').trim();
const RUN_REPORT_EMAIL_FROM = String(process.env.LEAD_SOURCER_RUN_REPORT_EMAIL_FROM || 'Urban Stone <sales@urbanstone.co>').trim();
const DAILY_STATE_FILE = process.env.LEAD_SOURCER_DAILY_STATE_FILE || path.resolve(__dirname, '..', 'runs', 'daily-state.json');

function envFlag(name, defaultValue = true) {
    const raw = String(process.env[name] || '').trim().toLowerCase();
    if (!raw) return defaultValue;
    return !['0', 'false', 'no', 'off'].includes(raw);
}

const ENABLE_REDDIT = envFlag('LEAD_SOURCER_ENABLE_REDDIT', true);
const ENABLE_CRAIGSLIST = envFlag('LEAD_SOURCER_ENABLE_CRAIGSLIST', true);
const ENABLE_APIFY = envFlag('LEAD_SOURCER_ENABLE_APIFY', true);
const ENABLE_PERMITS = isPermitsEnabled();
const ENABLE_PERMITS_HAMILTON = isHamiltonPermitsEnabled();
const ENABLE_PERMITS_BUTLER = isButlerPermitsEnabled();
const ENABLE_FB_MARKETPLACE = ENABLE_APIFY && APIFY_ENABLE_FB_MARKETPLACE && Boolean(APIFY_FB_MARKETPLACE_TASK_ID);

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
        return { matches: result, stats: { status: 'ok' } };
    }

    if (result && Array.isArray(result.matches)) {
        return {
            matches: result.matches,
            stats: { status: 'ok', ...(result.stats || {}) },
        };
    }

    return { matches: [], stats: { status: 'failed' } };
}

async function maybeSendRunReport(summary) {
    if (!SEND_RUN_REPORT || summary.mode !== 'live') return;

    const reportId = `run-report:${summary.startedAt}`;
    const reportEmailToken = String(Date.parse(summary.startedAt));
    const reportContactEmail = `run-report+${reportEmailToken}@urbanstone.co`;
    const htmlReport = buildRunReportHtml(summary);
    const textReport = buildRunReportText(summary, { runLogFile: RUN_LOG_FILE });

    const payload = {
        submittedAt: summary.completedAt,
        source: 'lead-sourcer-run-report',
        requestId: `lead-sourcer/report/${reportId}`,
        dedupeKey: reportId,
        verdict: 'match',
        score: 70,
        scoreBand: 'warm',
        hasAnchor: true,
        lead: {
            name: 'Lead Sourcer Run Report',
            // Keep non-empty contact fields so legacy Zap filters still pass run-report events.
            email: reportContactEmail,
            phone: reportId,
            projectDetails: textReport,
            htmlReport,
            externalPostId: reportId,
            externalPostUrl: '',
        },
        metadata: {
            requestId: `lead-sourcer/report/${reportId}`,
            routeId: 'lead-sourcer/report',
            dedupeKey: reportId,
            automated: true,
            verdict: 'match',
            score: 70,
            scoreBand: 'warm',
            hasAnchor: true,
            signalFactors: {
                directMatches: 1,
                materialSignals: 1,
                projectContext: 1,
                intentSignals: 1,
                excluded: 0,
            },
            reportRecipientEmail: RUN_REPORT_EMAIL,
        },
    };

    try {
        await relay(payload, {
            resend: {
                to: RUN_REPORT_EMAIL,
                from: RUN_REPORT_EMAIL_FROM,
                subject: `[Lead Sourcer] Run Report ${summary.startedAt}`,
                html: htmlReport,
                text: textReport,
            },
        });
        console.log(`[lead-sourcer] Run report delivered for ${summary.startedAt}`);
    } catch (error) {
        console.warn('[lead-sourcer] Failed to deliver run report:', error?.message || error);
    }
}

async function runOnce(mode) {
    const startedAt = new Date();
    console.log(`[lead-sourcer] Starting poll at ${startedAt.toISOString()} (mode=${mode})`);

    if (!ENABLE_REDDIT) console.log('[lead-sourcer] Reddit poller disabled (LEAD_SOURCER_ENABLE_REDDIT=false).');
    if (!ENABLE_CRAIGSLIST) console.log('[lead-sourcer] Craigslist poller disabled (LEAD_SOURCER_ENABLE_CRAIGSLIST=false).');
    if (!ENABLE_APIFY) console.log('[lead-sourcer] Apify poller disabled (LEAD_SOURCER_ENABLE_APIFY=false).');
    if (!ENABLE_PERMITS) console.log('[lead-sourcer] Permits poller disabled (LEAD_SOURCER_ENABLE_PERMITS is not true).');
    if (!ENABLE_PERMITS_HAMILTON) console.log('[lead-sourcer] Hamilton County permits disabled (LEAD_SOURCER_ENABLE_PERMITS_HAMILTON is not true).');
    if (!ENABLE_PERMITS_BUTLER) console.log('[lead-sourcer] Butler County permits disabled (LEAD_SOURCER_ENABLE_PERMITS_BUTLER is not true).');

    const [redditMatches, craigslistMatches, apifyMatches, permitsMatches, hamiltonMatches, butlerMatches] = await Promise.allSettled([
        ENABLE_REDDIT ? pollReddit({ mode }) : Promise.resolve({ matches: [], stats: { status: 'disabled' } }),
        ENABLE_CRAIGSLIST ? pollCraigslist({ mode }) : Promise.resolve({ matches: [], stats: { status: 'disabled' } }),
        ENABLE_APIFY ? pollApify({ mode }) : Promise.resolve({ matches: [], stats: { status: 'disabled' } }),
        ENABLE_PERMITS ? pollPermits({ mode }) : Promise.resolve({ matches: [], stats: { status: 'disabled' } }),
        ENABLE_PERMITS_HAMILTON ? pollHamiltonPermits({ mode }) : Promise.resolve({ matches: [], stats: { status: 'disabled' } }),
        ENABLE_PERMITS_BUTLER ? pollButlerPermits({ mode }) : Promise.resolve({ matches: [], stats: { status: 'disabled' } }),
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

    const permitsResult = permitsMatches.status === 'fulfilled'
        ? normalizePollResult(permitsMatches.value)
        : { matches: [], stats: {} };

    const hamiltonResult = hamiltonMatches.status === 'fulfilled'
        ? normalizePollResult(hamiltonMatches.value)
        : { matches: [], stats: {} };
    const butlerResult = butlerMatches.status === 'fulfilled'
        ? normalizePollResult(butlerMatches.value)
        : { matches: [], stats: {} };

    const redditCount = redditResult.matches.length;
    const clCount = craigslistResult.matches.length;
    const apifyCount = apifyResult.matches.length;
    const permitsCount = permitsResult.matches.length;
    const hamiltonCount = hamiltonResult.matches.length;
    const butlerCount = butlerResult.matches.length;

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
    if (permitsMatches.status === 'rejected') {
        console.error('[lead-sourcer] Permits poller error:', permitsMatches.reason);
        errors.push({ source: 'permits', message: String(permitsMatches.reason?.message || permitsMatches.reason) });
    }

    for (const [source, settled] of [['permits-hamilton', hamiltonMatches], ['permits-butler', butlerMatches]]) {
        if (settled.status !== 'rejected') continue;
        console.error(`[lead-sourcer] ${source} poller error:`, settled.reason);
        errors.push({ source, message: String(settled.reason?.message || settled.reason) });
    }

    const totalMatches = redditCount + clCount + apifyCount + permitsCount + hamiltonCount + butlerCount;
    console.log(`[lead-sourcer] Poll complete — Reddit: ${redditCount} match(es), Craigslist: ${clCount} match(es), Apify: ${apifyCount} match(es), Permits: ${permitsCount} match(es), Hamilton permits: ${hamiltonCount} match(es), Butler permits: ${butlerCount} match(es), mode=${mode}`);
    console.log('[lead-sourcer] Verdict stats', {
        reddit: redditResult.stats,
        craigslist: craigslistResult.stats,
        apify: apifyResult.stats,
        permits: permitsResult.stats,
        'permits-hamilton': hamiltonResult.stats,
        'permits-butler': butlerResult.stats,
    });

    const summary = {
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        mode,
        counts: {
            reddit: redditCount,
            craigslist: clCount,
            apify: apifyCount,
            permits: permitsCount,
            'permits-hamilton': hamiltonCount,
            'permits-butler': butlerCount,
            totalMatches,
        },
        verdicts: {
            reddit: redditResult.stats,
            craigslist: craigslistResult.stats,
            apify: apifyResult.stats,
            permits: permitsResult.stats,
            'permits-hamilton': hamiltonResult.stats,
            'permits-butler': butlerResult.stats,
        },
        sourceStatuses: {
            reddit: redditResult.stats.status || 'ok',
            craigslist: craigslistResult.stats.status || 'ok',
            apify: apifyResult.stats.status || 'ok',
            permits: permitsResult.stats.status || 'ok',
            'permits-hamilton': hamiltonResult.stats.status || 'ok',
            'permits-butler': butlerResult.stats.status || 'ok',
        },
        errors,
        // Drives which rows the run report shows; disabled sources are omitted.
        enabledSources: {
            reddit: ENABLE_REDDIT,
            craigslist: ENABLE_CRAIGSLIST,
            apify: ENABLE_APIFY,
            'fb-marketplace': ENABLE_FB_MARKETPLACE,
            permits: ENABLE_PERMITS,
            'permits-hamilton': ENABLE_PERMITS_HAMILTON,
            'permits-butler': ENABLE_PERMITS_BUTLER,
        },
        apifyCaps: ENABLE_FB_MARKETPLACE
            ? { mainUsd: APIFY_FB_MARKETPLACE_MAX_CHARGE_USD, canaryUsd: APIFY_FB_MARKETPLACE_CANARY_MAX_CHARGE_USD }
            : undefined,
        // Contact-free summaries (no email/phone) for the report's top-leads list.
        topLeads: rankTopLeads([
            ...redditResult.matches.map((m) => summarizeLeadForReport(m, 'reddit')),
            ...craigslistResult.matches.map((m) => summarizeLeadForReport(m, 'craigslist')),
            ...apifyResult.matches.map((m) => summarizeLeadForReport(m, m?.source === 'apify-facebook-marketplace' ? 'fb-marketplace' : 'apify-other')),
            ...permitsResult.matches.map((m) => summarizeLeadForReport(m, 'permits')),
            ...hamiltonResult.matches.map((m) => summarizeLeadForReport(m, 'permits-hamilton')),
            ...butlerResult.matches.map((m) => summarizeLeadForReport(m, 'permits-butler')),
        ]),
    };

    summary.health = assessRunHealth(summary, summary.enabledSources);
    if (summary.health.unhealthySources.length > 0) {
        console.warn(`[lead-sourcer] Unhealthy sources: ${summary.health.unhealthySources.join(', ')}${summary.health.allFailed ? ' (every enabled source failed)' : ''}`);
    }

    await appendRunSummary(summary);
    await maybeSendRunReport(summary);
    return summary;
}

async function scheduleDailyRunIfNeeded() {
    const state = readDailyState(DAILY_STATE_FILE);
    const now = new Date();
    const force = envFlag('LEAD_SOURCER_FORCE_RUN', false);
    const cooldownHours = resolveCooldownHours(process.env.LEAD_SOURCER_COOLDOWN_HOURS);
    const shouldRun = shouldRunDaily(state, now, { force, cooldownHours });
    if (force) console.log(`[lead-sourcer] Cooldown override (LEAD_SOURCER_FORCE_RUN); last run at ${state.lastRunAt || 'never'}.`);

    if (!shouldRun) {
        console.log(`[lead-sourcer] Daily run skipped; last run at ${state.lastRunAt || 'never'} is still within the ${cooldownHours}h cooldown.`);
        return { skipped: true, state };
    }

    const mode = resolveRunMode();
    const summary = await runOnce(mode);
    const nextState = {
        lastRunAt: new Date().toISOString(),
        // A run where every enabled source failed is recorded as failed so the
        // next scheduled invocation retries instead of waiting 24h.
        lastStatus: summary.health?.allFailed
            ? 'failed'
            : summary.counts.totalMatches > 0 ? 'success' : 'success-empty',
        summary,
    };

    writeDailyState(DAILY_STATE_FILE, nextState);
    return { skipped: false, state: nextState, summary };
}

// Non-zero exit lets a scheduler (GitHub Actions, cron) surface a broken
// source instead of reporting green on a run that fetched nothing.
function markExitCode(summary) {
    const unhealthy = summary?.health?.unhealthySources || [];
    if (unhealthy.includes('reddit')) console.warn('[lead-sourcer] Reddit degraded (public access may be blocked); not failing the run for Reddit alone.');
    if (unhealthy.includes('permits')) console.warn('[lead-sourcer] Permits degraded (city data or registry unavailable); warn-only.');
    for (const source of ['permits-hamilton', 'permits-butler']) {
        if (unhealthy.includes(source)) console.warn(`[lead-sourcer] ${source} degraded (county portal unavailable or changed); warn-only.`);
    }
    const WARN_ONLY_SOURCES = ['reddit', 'permits', 'permits-hamilton', 'permits-butler'];
    if (summary?.health?.allFailed || unhealthy.some((s) => !WARN_ONLY_SOURCES.includes(s))) process.exitCode = 1;
}

async function run() {
    const mode = resolveRunMode();
    const useInterval = Number.isFinite(INTERVAL_MINUTES) && INTERVAL_MINUTES > 0;

    const slot = checkScheduledSlot({
        eventName: process.env.GITHUB_EVENT_NAME,
        cron: process.env.LEAD_SOURCER_SCHEDULE_CRON,
        allowedHours: parseAllowedHours(process.env.LEAD_SOURCER_SCHEDULE_HOURS_ET),
    });
    if (!slot.run) {
        console.log(`[lead-sourcer] Scheduled slot skipped: cron '${process.env.LEAD_SOURCER_SCHEDULE_CRON}' is ${slot.localHour}:00 ET today (${slot.reason}).`);
        return;
    }

    if (mode === 'live' && !useInterval) {
        const result = await scheduleDailyRunIfNeeded();
        if (!result.skipped) markExitCode(result.summary);
        return;
    }

    if (!useInterval && mode !== 'live') {
        markExitCode(await runOnce(mode));
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

export { buildPreDraft, readDailyState, writeDailyState, shouldRunDaily, buildRunReportText, buildRunReportHtml };

run().catch((err) => {
    console.error('[lead-sourcer] Fatal error:', err);
    process.exitCode = 1;
});
