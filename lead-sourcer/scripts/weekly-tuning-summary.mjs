import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultNearMissLog = path.resolve(__dirname, '..', 'runs', 'near-miss-candidates.jsonl');
const defaultReviewLog = path.resolve(__dirname, '..', 'runs', 'review-candidates.jsonl');

const nearMissLogFile = process.env.LEAD_SOURCER_NEAR_MISS_LOG_FILE || defaultNearMissLog;
const reviewLogFile = process.env.LEAD_SOURCER_REVIEW_LOG_FILE || defaultReviewLog;
const windowDays = Number(process.env.LEAD_SOURCER_TUNING_WINDOW_DAYS || 7);

function parseJsonLine(line) {
    try {
        return JSON.parse(line);
    } catch {
        return null;
    }
}

async function readJsonl(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return raw
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map(parseJsonLine)
            .filter(Boolean);
    } catch (err) {
        if (err && err.code === 'ENOENT') return [];
        throw err;
    }
}

function inWindow(record, nowMs, windowMs) {
    const ts = Date.parse(String(record?.loggedAt || ''));
    return Number.isFinite(ts) && nowMs - ts <= windowMs;
}

function incrementCounter(map, key) {
    map[key] = (map[key] || 0) + 1;
}

function summarizeNearMiss(records) {
    const sourceCounts = {};
    const scoreBands = { hot: 0, warm: 0, tepid: 0, cold: 0 };
    const scores = [];

    for (const record of records) {
        const source = String(record?.source || 'unknown');
        incrementCounter(sourceCounts, source);

        const band = String(record?.score?.band || 'cold');
        if (Object.prototype.hasOwnProperty.call(scoreBands, band)) {
            scoreBands[band] += 1;
        } else {
            scoreBands.cold += 1;
        }

        const value = Number(record?.score?.score);
        if (Number.isFinite(value)) scores.push(value);
    }

    scores.sort((a, b) => a - b);

    const p50 = scores.length ? scores[Math.floor(scores.length * 0.5)] : null;
    const p75 = scores.length ? scores[Math.floor(scores.length * 0.75)] : null;
    const p90 = scores.length ? scores[Math.floor(scores.length * 0.9)] : null;

    return {
        total: records.length,
        sourceCounts,
        scoreBands,
        percentiles: {
            p50,
            p75,
            p90,
        },
    };
}

function summarizeReview(records) {
    const sourceCounts = {};
    const reasonCounts = {};

    for (const record of records) {
        const source = String(record?.source || 'unknown');
        const reason = String(record?.reason || 'unspecified');
        incrementCounter(sourceCounts, source);
        incrementCounter(reasonCounts, reason);
    }

    return {
        total: records.length,
        sourceCounts,
        reasonCounts,
    };
}

function suggestionFromSummary(nearMissSummary, threshold) {
    const p75 = Number(nearMissSummary?.percentiles?.p75);
    const p90 = Number(nearMissSummary?.percentiles?.p90);

    if (!Number.isFinite(p75) || !Number.isFinite(p90)) {
        return 'Insufficient near-miss history. Keep current threshold and gather at least one week of logs.';
    }

    if (p90 < threshold) {
        return `Most near-miss candidates are below threshold ${threshold}. Consider lowering LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD toward ${Math.max(35, Math.floor(p75))}.`;
    }

    if (p75 > threshold + 15) {
        return `Near-miss scores are concentrated well above threshold ${threshold}. Consider raising threshold toward ${Math.min(70, Math.floor(p75 - 5))} to reduce queue size.`;
    }

    return `Threshold ${threshold} appears reasonable for current distribution (p75=${Math.floor(p75)}, p90=${Math.floor(p90)}).`;
}

function toMarkdownBlock(title, obj) {
    return `${title}\n${JSON.stringify(obj, null, 2)}`;
}

async function main() {
    const nowMs = Date.now();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    const [nearMissAll, reviewAll] = await Promise.all([
        readJsonl(nearMissLogFile),
        readJsonl(reviewLogFile),
    ]);

    const nearMissRecords = nearMissAll.filter((record) => inWindow(record, nowMs, windowMs));
    const reviewRecords = reviewAll.filter((record) => inWindow(record, nowMs, windowMs));

    const nearMissSummary = summarizeNearMiss(nearMissRecords);
    const reviewSummary = summarizeReview(reviewRecords);
    const threshold = Number(process.env.LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD || 45);

    const output = {
        generatedAt: new Date().toISOString(),
        windowDays,
        threshold,
        nearMissLogFile,
        reviewLogFile,
        nearMiss: nearMissSummary,
        review: reviewSummary,
        suggestion: suggestionFromSummary(nearMissSummary, threshold),
    };

    console.log('[lead-sourcer] Weekly tuning summary');
    console.log(JSON.stringify(output, null, 2));

    if (nearMissSummary.total === 0 && reviewSummary.total === 0) {
        console.log(toMarkdownBlock('[lead-sourcer] Note', {
            message: 'No review/near-miss records in the selected window.',
        }));
    }
}

main().catch((err) => {
    console.error('[lead-sourcer] Weekly tuning summary fatal:', err);
    process.exitCode = 1;
});
