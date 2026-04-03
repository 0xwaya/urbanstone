import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRunLog = path.resolve(__dirname, '..', 'runs', 'poll-runs.jsonl');
const runLogFile = process.env.LEAD_SOURCER_RUN_LOG_FILE || defaultRunLog;
const windowHours = Number(process.env.LEAD_SOURCER_SUMMARY_WINDOW_HOURS || 24);
const zeroMatchAlertThreshold = Number(process.env.LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD || 0);

function parseJsonLine(line) {
    try {
        return JSON.parse(line);
    } catch {
        return null;
    }
}

function sumBy(records, key) {
    return records.reduce((total, record) => total + Number(record?.counts?.[key] || 0), 0);
}

function getZeroMatchStreak(records) {
    let streak = 0;
    for (let i = records.length - 1; i >= 0; i -= 1) {
        if (Number(records[i]?.counts?.totalMatches || 0) === 0) {
            streak += 1;
        } else {
            break;
        }
    }
    return streak;
}

async function readRunRecords() {
    try {
        const raw = await fs.readFile(runLogFile, 'utf8');
        return raw
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map(parseJsonLine)
            .filter(Boolean)
            .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
}

function buildSummary(records) {
    const now = Date.now();
    const windowMs = windowHours * 60 * 60 * 1000;
    const recent = records.filter((record) => {
        const ts = Date.parse(String(record.startedAt || ''));
        return Number.isFinite(ts) && now - ts <= windowMs;
    });

    const runs = recent.length;
    const redditMatches = sumBy(recent, 'reddit');
    const craigslistMatches = sumBy(recent, 'craigslist');
    const apifyMatches = sumBy(recent, 'apify');
    const totalMatches = sumBy(recent, 'totalMatches');
    const zeroMatchRuns = recent.filter((record) => Number(record?.counts?.totalMatches || 0) === 0).length;
    const errors = recent.reduce((total, record) => total + (Array.isArray(record.errors) ? record.errors.length : 0), 0);
    const zeroMatchStreak = getZeroMatchStreak(recent);

    return {
        generatedAt: new Date().toISOString(),
        runLogFile,
        windowHours,
        runs,
        totalMatches,
        sourceMatches: {
            reddit: redditMatches,
            craigslist: craigslistMatches,
            apify: apifyMatches,
        },
        zeroMatchRuns,
        zeroMatchStreak,
        errors,
        thresholdAlert: zeroMatchAlertThreshold > 0 && zeroMatchStreak >= zeroMatchAlertThreshold,
    };
}

async function main() {
    const records = await readRunRecords();
    const summary = buildSummary(records);

    console.log('[lead-sourcer] Daily summary');
    console.log(JSON.stringify(summary, null, 2));

    if (summary.thresholdAlert) {
        console.warn(`[lead-sourcer] Alert: zero-match streak ${summary.zeroMatchStreak} reached threshold ${zeroMatchAlertThreshold}`);
        process.exitCode = 2;
    }
}

main().catch((err) => {
    console.error('[lead-sourcer] Summary fatal:', err);
    process.exitCode = 1;
});
