/**
 * Run report (email text + HTML). Rows are driven by the enable flags: a
 * disabled source is omitted entirely and reappears once its switch is back on.
 * The report never includes lead contact details (email/phone).
 */

const SOURCES = [
    { key: 'permits', label: 'Cincinnati permits', icon: '🏗️', extra: (s) => [['Registry matched', num(s, 'registryMatched')]] },
    { key: 'permits-hamilton', label: 'Hamilton County permits', icon: '🏗️', extra: (s) => [['Type candidates', num(s, 'typeCandidates')], ['Details read', num(s, 'detailFetches')], ['Registry matched', num(s, 'registryMatched')]] },
    { key: 'permits-butler', label: 'Butler County permits', icon: '🏗️', extra: (s) => [['Type candidates', num(s, 'typeCandidates')], ['Details read', num(s, 'detailFetches')], ['Registry matched', num(s, 'registryMatched')]] },
    { key: 'fb-marketplace', label: 'Facebook Marketplace (trial)', icon: '🛒' },
    { key: 'apify-other', label: 'Apify (Nextdoor / Facebook groups)', icon: '🤖' },
    { key: 'reddit', label: 'Reddit', icon: '📱' },
    { key: 'craigslist', label: 'Craigslist', icon: '🏷️', extra: (s) => [['Body fetches', num(s, 'bodyFetches')]] },
];

export const SOURCE_LABELS = Object.fromEntries(SOURCES.map((s) => [s.key, s.label]));
const MARKETPLACE_TASK = 'facebook-marketplace';
const MARKETPLACE_TASKS = new Set([MARKETPLACE_TASK, 'facebook-marketplace-canary']);

function num(stats, key) {
    const value = Number(stats?.[key]);
    return Number.isFinite(value) ? value : 0;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function usd(value) {
    return Number.isFinite(value) ? `$${value.toFixed(value < 1 ? 3 : 2)}` : 'n/a';
}

function formatEt(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso || 'unknown');
    return `${date.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })} ET`;
}

function normalizeStatus(raw, errored) {
    if (errored) return 'error';
    const status = String(raw || 'unknown').toLowerCase();
    if (status === 'ok') return 'ok';
    if (['failed', 'error', 'parse-error'].includes(status)) return 'error';
    return 'degraded';
}

/** Which report rows are on. Uses summary.enabledSources when present, else infers from statuses. */
export function resolveEnabledSources(summary) {
    const flags = summary?.enabledSources;
    const statuses = summary?.sourceStatuses || {};
    const on = (key) => (flags && key in flags ? flags[key] === true : Boolean(statuses[key]) && statuses[key] !== 'disabled');
    const apifyOn = on('apify');
    const byTask = summary?.verdicts?.apify?.byTask || {};
    const otherApifyTasks = Object.keys(byTask).filter((task) => !MARKETPLACE_TASKS.has(task));
    const marketplaceOn = apifyOn && (flags && 'fb-marketplace' in flags
        ? flags['fb-marketplace'] === true
        : Boolean(byTask[MARKETPLACE_TASK] || summary?.verdicts?.apify?.canary));
    return {
        permits: on('permits'),
        'permits-hamilton': on('permits-hamilton'),
        'permits-butler': on('permits-butler'),
        'fb-marketplace': marketplaceOn,
        'apify-other': apifyOn && otherApifyTasks.length > 0,
        reddit: on('reddit'),
        craigslist: on('craigslist'),
    };
}

function errorsFor(summary, source) {
    return (summary?.errors || []).filter((error) => error.source === source);
}

function marketplaceRow(summary) {
    const apify = summary?.verdicts?.apify || {};
    const task = apify.byTask?.[MARKETPLACE_TASK] || {};
    const canary = apify.canary;
    const reasons = (apify.unhealthyReasons || []).filter((reason) => reason.startsWith('facebook-marketplace'));
    let status = normalizeStatus('ok', errorsFor(summary, 'apify').length > 0);
    if (status === 'ok' && (reasons.length > 0 || (canary && !canary.healthy))) status = 'degraded';
    const spendParts = [canary?.costUsd, task.costUsd].filter(Number.isFinite);
    const spend = spendParts.length ? spendParts.reduce((a, b) => a + b, 0) : null;
    const caps = summary?.apifyCaps || {};
    const capTotal = Number.isFinite(caps.mainUsd) && Number.isFinite(caps.canaryUsd) ? caps.mainUsd + caps.canaryUsd : null;
    return {
        status,
        fetched: num(task, 'fetched'),
        matched: num(task, 'matches'),
        emailed: num(task, 'relayed'),
        details: [
            ['Canary', canary ? `${canary.healthy ? 'healthy' : 'UNHEALTHY'} (${canary.items} items)` : 'not run'],
            ['Out of area dropped', num(task, 'droppedOutOfArea')],
            ['Remodel signals (logged)', num(task, 'kind_remodel')],
            ['Apify spend', `${usd(spend)}${capTotal != null ? ` (cap ${usd(capTotal)}/run)` : ''}`],
        ],
        notes: reasons,
        spendUsd: spend,
    };
}

function apifyOtherRow(summary) {
    const apify = summary?.verdicts?.apify || {};
    const tasks = Object.entries(apify.byTask || {}).filter(([task]) => !MARKETPLACE_TASKS.has(task));
    const sum = (key) => tasks.reduce((total, [, stats]) => total + num(stats, key), 0);
    const reasons = (apify.unhealthyReasons || []).filter((reason) => !reason.startsWith('facebook-marketplace'));
    let status = normalizeStatus('ok', errorsFor(summary, 'apify').length > 0);
    if (status === 'ok' && reasons.length > 0) status = 'degraded';
    return { status, fetched: sum('fetched'), matched: sum('matches'), emailed: sum('relayed'), details: tasks.map(([task, stats]) => [task, `${num(stats, 'fetched')} fetched`]), notes: reasons };
}

/** One row per enabled source, in display order. */
export function buildSourceRows(summary) {
    const enabled = resolveEnabledSources(summary);
    return SOURCES.filter((source) => enabled[source.key]).map((source) => {
        let row;
        if (source.key === 'fb-marketplace') row = marketplaceRow(summary);
        else if (source.key === 'apify-other') row = apifyOtherRow(summary);
        else {
            const stats = summary?.verdicts?.[source.key] || {};
            row = {
                status: normalizeStatus(summary?.sourceStatuses?.[source.key] || stats.status, errorsFor(summary, source.key).length > 0),
                fetched: num(stats, 'fetched'),
                matched: num(stats, 'matches'),
                emailed: num(stats, 'relayed'),
                details: source.extra ? source.extra(stats) : [],
                notes: [],
            };
        }
        const errors = errorsFor(summary, source.key).map((error) => error.message);
        return { key: source.key, label: source.label, icon: source.icon, ...row, notes: [...row.notes, ...errors] };
    });
}

function totals(rows) {
    return rows.reduce((acc, row) => ({
        fetched: acc.fetched + row.fetched,
        matched: acc.matched + row.matched,
        emailed: acc.emailed + row.emailed,
    }), { fetched: 0, matched: 0, emailed: 0 });
}

function topLeadsFor(summary, rows) {
    const shown = new Set(rows.map((row) => row.key));
    return (summary?.topLeads || []).filter((lead) => shown.has(lead.source)).slice(0, 10);
}

export function buildRunReportText(summary, { runLogFile } = {}) {
    const rows = buildSourceRows(summary);
    const total = totals(rows);
    const leads = topLeadsFor(summary, rows);
    const lines = [
        '[LEAD SOURCER RUN REPORT]',
        `Sources: ${rows.map((row) => row.label).join(', ') || 'none enabled'}`,
        `Run: ${formatEt(summary.startedAt)} (mode=${summary.mode})`,
        `Totals: fetched=${total.fetched}, matched=${total.matched}, emailed=${total.emailed}`,
        '',
        'Top leads:',
        ...(leads.length
            ? leads.map((lead, i) => `  ${i + 1}. [${SOURCE_LABELS[lead.source] || lead.source}] ${lead.headline}${lead.city ? ` (${lead.city})` : ''}${Number.isFinite(lead.score) ? ` score ${lead.score}` : ''}${lead.estimatedCost ? ` est. $${Math.round(lead.estimatedCost).toLocaleString('en-US')}` : ''}`)
            : ['  (none this run)']),
        '',
        'Source | status | fetched | matched | emailed',
        ...rows.map((row) => `${row.label} | ${row.status} | ${row.fetched} | ${row.matched} | ${row.emailed}`),
    ];
    for (const row of rows) {
        const parts = [...row.details.map(([k, v]) => `${k}: ${v}`), ...row.notes.map((note) => `note: ${note}`)];
        if (parts.length) lines.push(`  ${row.label}: ${parts.join('; ')}`);
    }
    const shownErrorSources = new Set(rows.map((row) => (row.key.startsWith('fb-') || row.key === 'apify-other' ? 'apify' : row.key)));
    const otherErrors = (summary.errors || []).filter((error) => !shownErrorSources.has(error.source) && resolveEnabledSources(summary)[error.source] !== false);
    if (otherErrors.length) lines.push('', `Errors: ${otherErrors.map((error) => `${error.source}: ${error.message}`).join(' | ')}`);
    if (runLogFile) lines.push('', `Run log file: ${runLogFile}`);
    return lines.join('\n');
}

const STATUS_COLORS = { ok: '#2e7d32', degraded: '#ef6c00', error: '#c62828' };

export function buildRunReportHtml(summary) {
    const rows = buildSourceRows(summary);
    const total = totals(rows);
    const leads = topLeadsFor(summary, rows);
    const durationSec = ((new Date(summary.completedAt) - new Date(summary.startedAt)) / 1000).toFixed(1);
    const cell = 'padding:8px 10px;border-bottom:1px solid #eee;';
    const badge = (status) => `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;color:#fff;background:${STATUS_COLORS[status] || '#757575'};">${escapeHtml(status)}</span>`;

    const leadRows = leads.length
        ? leads.map((lead) => `<tr><td style="${cell}">${escapeHtml(SOURCE_LABELS[lead.source] || lead.source)}</td><td style="${cell}">${escapeHtml(lead.headline)}</td><td style="${cell}">${escapeHtml(lead.city || '')}</td><td style="${cell}text-align:right;">${lead.estimatedCost ? `$${Math.round(lead.estimatedCost).toLocaleString('en-US')}` : ''}</td><td style="${cell}text-align:right;">${Number.isFinite(lead.score) ? lead.score : ''}</td></tr>`).join('')
        : `<tr><td colspan="5" style="${cell}color:#999;">No new leads this run.</td></tr>`;

    const sourceRows = rows.map((row) => `<tr><td style="${cell}">${row.icon} ${escapeHtml(row.label)}</td><td style="${cell}">${badge(row.status)}</td><td style="${cell}text-align:right;">${row.fetched}</td><td style="${cell}text-align:right;">${row.matched}</td><td style="${cell}text-align:right;">${row.emailed}</td></tr>`
        + (row.details.length || row.notes.length
            ? `<tr><td colspan="5" style="padding:0 10px 10px 34px;border-bottom:1px solid #eee;font-size:12px;color:#666;">${[...row.details.map(([k, v]) => `${escapeHtml(k)}: <strong>${escapeHtml(v)}</strong>`), ...row.notes.map((note) => `<span style="color:#c62828;">${escapeHtml(note)}</span>`)].join(' · ')}</td></tr>`
            : '')).join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lead Sourcer Run Report</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:800px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:24px 30px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:24px;">Lead Sourcer Run Report</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">Sources: ${escapeHtml(rows.map((row) => row.label).join(' · ') || 'none enabled')}</p>
  </div>
  <div style="padding:24px 30px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr>
      <td style="width:33%;padding:14px;background:#f9f9f9;border-left:4px solid #667eea;"><div style="font-size:12px;color:#999;text-transform:uppercase;">Fetched</div><div style="font-size:28px;font-weight:bold;">${total.fetched}</div></td>
      <td style="width:33%;padding:14px;background:#f9f9f9;border-left:4px solid #4caf50;"><div style="font-size:12px;color:#999;text-transform:uppercase;">Matched</div><div style="font-size:28px;font-weight:bold;">${total.matched}</div></td>
      <td style="width:33%;padding:14px;background:#f9f9f9;border-left:4px solid #2196f3;"><div style="font-size:12px;color:#999;text-transform:uppercase;">Emailed to sales@</div><div style="font-size:28px;font-weight:bold;">${total.emailed}</div></td>
    </tr></table>
    <h2 style="font-size:17px;margin:0 0 8px;">🎯 Top leads</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <tr style="background:#fafafa;text-align:left;"><th style="${cell}">Source</th><th style="${cell}">Lead</th><th style="${cell}">Area</th><th style="${cell}text-align:right;">Est. cost</th><th style="${cell}text-align:right;">Score</th></tr>
      ${leadRows}
    </table>
    <h2 style="font-size:17px;margin:0 0 8px;">Sources</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="background:#fafafa;text-align:left;"><th style="${cell}">Source</th><th style="${cell}">Status</th><th style="${cell}text-align:right;">Fetched</th><th style="${cell}text-align:right;">Matched</th><th style="${cell}text-align:right;">Emailed</th></tr>
      ${sourceRows || `<tr><td colspan="5" style="${cell}color:#999;">No sources enabled.</td></tr>`}
    </table>
  </div>
  <div style="background:#f9f9f9;padding:16px 30px;border-radius:0 0 8px 8px;font-size:12px;color:#999;border-top:1px solid #e0e0e0;">
    <p style="margin:0;"><strong>Run:</strong> ${escapeHtml(formatEt(summary.startedAt))} → ${escapeHtml(formatEt(summary.completedAt))} · <strong>Mode:</strong> ${escapeHtml(summary.mode)} · <strong>Duration:</strong> ${durationSec}s</p>
    <p style="margin:6px 0 0;">Leads are emailed to sales@ only; contractors and sellers are never contacted automatically.</p>
  </div>
</div>
</body>
</html>`;
}

/** Contact-free one-line summary of a match for the report's top-leads list. */
export function summarizeLeadForReport(match, source) {
    const truncate = (text, max = 90) => {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
    };
    if (match?.lead && match?.metadata) {
        const work = match.metadata.workSummary ? ` — ${match.metadata.workSummary}` : '';
        return {
            source,
            headline: truncate(`${match.lead.name || 'Unknown'}${work}`),
            city: match.metadata.city || '',
            estimatedCost: Number(match.metadata.estimatedCost) || null,
            score: Number.isFinite(match.score) ? match.score : null,
        };
    }
    return {
        source,
        headline: truncate(match?.title || 'Untitled post'),
        city: match?.marketplace?.city || '',
        estimatedCost: null,
        score: Number.isFinite(match?.score) ? match.score : null,
    };
}

export function rankTopLeads(entries, limit = 10) {
    return [...entries].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, limit);
}
