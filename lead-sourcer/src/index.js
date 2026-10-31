/**
 * Main entry point — runs the permit pollers once, or on a configured interval.
 * Live sources: Hamilton County permits, Cincinnati permits (Socrata), Butler
 * County permits. Reddit, Craigslist and Apify/Facebook were retired on
 * 2026-10-30 and are no longer imported; their env switches are ignored.
 * Default behavior remains one-shot; interval mode is opt-in.
 *
 * Usage:
 *   LEAD_SOURCER_MODE=live RESEND_API_KEY=... node src/index.js
 *
 * Scheduled by .github/workflows/lead-sourcer.yml. Zapier is retired.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './config.js';
import { pollPermits, isPermitsEnabled } from './permits.js';
import { pollHamiltonPermits, pollButlerPermits, isHamiltonPermitsEnabled, isButlerPermitsEnabled } from './permits-accela.js';
import { resolveRunMode } from './mode.js';
import { relay } from './relay.js';
import { initializeTracing } from './tracing.js';
import { assessRunHealth } from './run-health.js';
import { buildRunReportText, buildRunReportHtml, summarizeLeadForReport, rankTopLeads } from './run-report.js';
import { buildPreDraft, shouldRunDaily, readDailyState, writeDailyState, resolveCooldownHours } from './daily-runner.js';
import { checkScheduledSlot, parseAllowedHours } from './schedule-guard.js';
import { syncLeadsToCrm, scrubError } from './crm-sync.js';

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

const ENABLE_PERMITS = isPermitsEnabled();
const ENABLE_PERMITS_HAMILTON = isHamiltonPermitsEnabled();
const ENABLE_PERMITS_BUTLER = isButlerPermitsEnabled();

// Live sources in report order: Hamilton County first.
const SOURCES = [
    { key: 'permits-hamilton', label: 'Hamilton County permits', enabled: ENABLE_PERMITS_HAMILTON, poll: pollHamiltonPermits, envName: 'LEAD_SOURCER_ENABLE_PERMITS_HAMILTON' },
    { key: 'permits', label: 'Cincinnati permits', enabled: ENABLE_PERMITS, poll: pollPermits, envName: 'LEAD_SOURCER_ENABLE_PERMITS' },
    { key: 'permits-butler', label: 'Butler County permits', enabled: ENABLE_PERMITS_BUTLER, poll: pollButlerPermits, envName: 'LEAD_SOURCER_ENABLE_PERMITS_BUTLER' },
];

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

    for (const source of SOURCES) {
        if (!source.enabled) console.log(`[lead-sourcer] ${source.label} disabled (${source.envName} is not true).`);
    }

    const settled = await Promise.allSettled(SOURCES.map((source) => (
        source.enabled ? source.poll({ mode }) : Promise.resolve({ matches: [], stats: { status: 'disabled' } })
    )));

    const results = {};
    const errors = [];
    SOURCES.forEach((source, i) => {
        const outcome = settled[i];
        if (outcome.status === 'fulfilled') {
            results[source.key] = normalizePollResult(outcome.value);
        } else {
            results[source.key] = { matches: [], stats: {} };
            console.error(`[lead-sourcer] ${source.key} poller error:`, outcome.reason);
            errors.push({ source: source.key, message: String(outcome.reason?.message || outcome.reason) });
        }
    });

    const counts = {};
    const verdicts = {};
    const sourceStatuses = {};
    const enabledSources = {};
    for (const source of SOURCES) {
        counts[source.key] = results[source.key].matches.length;
        verdicts[source.key] = results[source.key].stats;
        sourceStatuses[source.key] = results[source.key].stats.status || 'ok';
        enabledSources[source.key] = source.enabled;
    }
    const totalMatches = SOURCES.reduce((total, source) => total + counts[source.key], 0);
    counts.totalMatches = totalMatches;

    console.log(`[lead-sourcer] Poll complete — ${SOURCES.map((source) => `${source.label}: ${counts[source.key]} match(es)`).join(', ')}, mode=${mode}`);
    console.log('[lead-sourcer] Verdict stats', verdicts);

    const summary = {
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        mode,
        counts,
        verdicts,
        sourceStatuses,
        errors,
        // Drives which rows the run report shows; disabled sources are omitted.
        enabledSources,
        // Contact-free summaries (no email/phone) for the report's top-leads list.
        topLeads: rankTopLeads(SOURCES.flatMap((source) => results[source.key].matches.map((m) => summarizeLeadForReport(m, source.key)))),
    };

    // CRM sync runs only after every lead email above has been sent, so it can
    // never block or delay one. Off unless CRM_SYNC_ENABLED=true; failures are
    // reported in the run report, never thrown.
    if (mode === 'live') {
        try {
            summary.crm = await syncLeadsToCrm(
                SOURCES.flatMap((source) => results[source.key].matches.map((payload) => ({ payload, sourceKey: source.key }))),
                { runId: process.env.GITHUB_RUN_ID ? `gh-${process.env.GITHUB_RUN_ID}` : summary.startedAt },
            );
        } catch (error) {
            summary.crm = { enabled: true, attempted: 0, created: 0, existing: 0, failed: 0, repeats: [], errors: [scrubError(error)] };
        }
    }

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
    if (unhealthy.includes('permits')) console.warn('[lead-sourcer] Permits degraded (city data or registry unavailable); warn-only.');
    for (const source of ['permits-hamilton', 'permits-butler']) {
        if (unhealthy.includes(source)) console.warn(`[lead-sourcer] ${source} degraded (county portal unavailable or changed); warn-only.`);
    }
    // Permit sources are warn-only; fail the job only when every enabled source failed.
    if (summary?.health?.allFailed) process.exitCode = 1;
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
        console.log(`[lead-sourcer] Scheduled slot skipped: cron '${process.env.LEAD_SOURCER_SCHEDULE_CRON}' is ${slot.localHour}:00 ET${slot.weekday ? ` ${slot.weekday}` : ''} (${slot.reason}).`);
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
