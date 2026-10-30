/**
 * Run report (email text + HTML). Rows are driven by the enable flags: a
 * disabled source is omitted entirely and reappears once its switch is back on.
 * Only the live permit sources are reported (Hamilton County first). Reddit,
 * Craigslist and Apify/Facebook were retired on 2026-10-30 and never appear,
 * even in older run summaries that still carry them.
 * The report never includes lead contact details (email/phone).
 */

const permitExtra = (s) => [['Type candidates', num(s, 'typeCandidates')], ['Details read', num(s, 'detailFetches')], ['Registry matched', num(s, 'registryMatched')]];
const SOURCES = [
    { key: 'permits-hamilton', label: 'Hamilton County permits', extra: permitExtra },
    { key: 'permits', label: 'Cincinnati permits', extra: (s) => [['Registry matched', num(s, 'registryMatched')]] },
    { key: 'permits-butler', label: 'Butler County permits', extra: permitExtra },
];

export const SOURCE_LABELS = Object.fromEntries(SOURCES.map((s) => [s.key, s.label]));
const LIVE_SOURCE_KEYS = new Set(SOURCES.map((s) => s.key));

function num(stats, key) {
    const value = Number(stats?.[key]);
    return Number.isFinite(value) ? value : 0;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    return Object.fromEntries(SOURCES.map((source) => [source.key, on(source.key)]));
}

function errorsFor(summary, source) {
    return (summary?.errors || []).filter((error) => error.source === source);
}

/** One row per enabled source, in display order. */
export function buildSourceRows(summary) {
    const enabled = resolveEnabledSources(summary);
    return SOURCES.filter((source) => enabled[source.key]).map((source) => {
        const stats = summary?.verdicts?.[source.key] || {};
        const errors = errorsFor(summary, source.key).map((error) => error.message);
        return {
            key: source.key,
            label: source.label,
            status: normalizeStatus(summary?.sourceStatuses?.[source.key] || stats.status, errors.length > 0),
            fetched: num(stats, 'fetched'),
            matched: num(stats, 'matches'),
            emailed: num(stats, 'relayed'),
            details: source.extra ? source.extra(stats) : [],
            notes: errors,
        };
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

function money(value) {
    return value ? `$${Math.round(value).toLocaleString('en-US')}` : '';
}

/** Contact-free CRM sync lines (null when CRM sync is off for this run). */
export function buildCrmSection(summary) {
    const crm = summary?.crm;
    if (!crm || !crm.enabled) return null;
    const headline = `CRM sync: ${crm.created || 0} new intake(s), ${crm.existing || 0} already in CRM, ${crm.failed || 0} failed`;
    const repeats = (crm.repeats || []).map((r) => `REPEAT contractor: ${r.company}${r.permitNumber ? ` (permit ${r.permitNumber})` : ''} — ${r.priorIntakes} earlier intake(s), ${r.priorEmails} earlier email(s) from us`);
    const errors = (crm.errors || []).map((e) => `CRM error: ${e}`);
    const keepalive = crm.keepalive && !crm.keepalive.ok ? [`CRM keep-alive failed: ${crm.keepalive.error || 'unknown'}`] : [];
    return { headline, repeats, errors: [...errors, ...keepalive] };
}

export function buildRunReportText(summary, { runLogFile } = {}) {
    const rows = buildSourceRows(summary);
    const total = totals(rows);
    const leads = topLeadsFor(summary, rows);
    const lines = [
        '[LEAD SOURCER RUN REPORT]',
        `Run: ${formatEt(summary.startedAt)} (mode=${summary.mode})`,
        `Totals: fetched=${total.fetched}, matched=${total.matched}, emailed=${total.emailed}`,
        '',
        'Source | status | fetched | matched | emailed',
        ...(rows.length ? rows.map((row) => `${row.label} | ${row.status} | ${row.fetched} | ${row.matched} | ${row.emailed}`) : ['(no sources enabled)']),
    ];
    for (const row of rows) {
        const parts = [...row.details.map(([k, v]) => `${k}: ${v}`), ...row.notes.map((note) => `note: ${note}`)];
        if (parts.length) lines.push(`  ${row.label}: ${parts.join('; ')}`);
    }
    lines.push(
        '',
        'Top leads:',
        ...(leads.length
            ? leads.map((lead, i) => `  ${i + 1}. [${SOURCE_LABELS[lead.source] || lead.source}] ${lead.headline}${lead.city ? ` (${lead.city})` : ''}${Number.isFinite(lead.score) ? ` score ${lead.score}` : ''}${lead.estimatedCost ? ` est. ${money(lead.estimatedCost)}` : ''}`)
            : ['  (none this run)']),
    );
    const crm = buildCrmSection(summary);
    if (crm) lines.push('', crm.headline, ...crm.repeats.map((l) => `  ${l}`), ...crm.errors.map((l) => `  ${l}`));
    if (runLogFile) lines.push('', `Run log file: ${runLogFile}`);
    return lines.join('\n');
}

const BRAND = { navy: '#0B1220', gold: '#C4A35A', ink: '#1B2333', muted: '#6B7280', line: '#E7E2D6', paper: '#F6F3EC' };
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = "Manrope,'Helvetica Neue',Helvetica,Arial,sans-serif";
const STATUS_COLORS = { ok: '#2E7D32', degraded: '#B26A00', error: '#B3261E' };

export function buildRunReportHtml(summary) {
    const rows = buildSourceRows(summary);
    const total = totals(rows);
    const leads = topLeadsFor(summary, rows);
    const crm = buildCrmSection(summary);
    const crmHtml = crm
        ? `<h2 style="font-family:${SERIF};font-size:21px;font-weight:600;color:${BRAND.navy};margin:26px 0 8px;">CRM</h2><p style="margin:0 0 6px;font-size:13px;">${escapeHtml(crm.headline)}</p>${crm.repeats.map((l) => `<p style="margin:0 0 4px;font-size:13px;color:${BRAND.navy};font-weight:600;">${escapeHtml(l)}</p>`).join('')}${crm.errors.map((l) => `<p style="margin:0 0 4px;font-size:12px;color:${STATUS_COLORS.error};">${escapeHtml(l)}</p>`).join('')}`
        : '';
    const durationSec = ((new Date(summary.completedAt) - new Date(summary.startedAt)) / 1000).toFixed(1);
    const cell = `padding:10px 12px;border-bottom:1px solid ${BRAND.line};`;
    const th = `${cell}font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};font-weight:600;`;
    const badge = (status) => `<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;color:#fff;background:${STATUS_COLORS[status] || '#757575'};">${escapeHtml(status)}</span>`;
    const stat = (label, value) => `<td style="width:33%;padding:14px 16px;background:${BRAND.paper};border-top:3px solid ${BRAND.gold};"><div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};">${label}</div><div style="font-family:${SERIF};font-size:32px;font-weight:600;color:${BRAND.navy};line-height:1.1;">${value}</div></td>`;

    const sourceRows = rows.map((row) => `<tr><td style="${cell}font-weight:600;color:${BRAND.navy};">${escapeHtml(row.label)}</td><td style="${cell}">${badge(row.status)}</td><td style="${cell}text-align:right;">${row.fetched}</td><td style="${cell}text-align:right;">${row.matched}</td><td style="${cell}text-align:right;">${row.emailed}</td></tr>`
        + (row.details.length || row.notes.length
            ? `<tr><td colspan="5" style="padding:0 12px 10px;border-bottom:1px solid ${BRAND.line};font-size:12px;color:${BRAND.muted};">${[...row.details.map(([k, v]) => `${escapeHtml(k)}: <strong style="color:${BRAND.ink};">${escapeHtml(v)}</strong>`), ...row.notes.map((note) => `<span style="color:${STATUS_COLORS.error};">${escapeHtml(note)}</span>`)].join(' &middot; ')}</td></tr>`
            : '')).join('');

    const leadRows = leads.length
        ? leads.map((lead) => `<tr><td style="${cell}">${escapeHtml(lead.headline)}<div style="font-size:11px;color:${BRAND.muted};margin-top:2px;">${escapeHtml(SOURCE_LABELS[lead.source] || lead.source)}</div></td><td style="${cell}">${escapeHtml(lead.city || '')}</td><td style="${cell}text-align:right;white-space:nowrap;">${money(lead.estimatedCost)}</td><td style="${cell}text-align:right;">${Number.isFinite(lead.score) ? lead.score : ''}</td></tr>`).join('')
        : `<tr><td colspan="4" style="${cell}color:${BRAND.muted};">No new leads this run.</td></tr>`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lead Sourcer Run Report</title></head>
<body style="margin:0;padding:24px 12px;background:${BRAND.paper};font-family:${SANS};color:${BRAND.ink};">
<div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid ${BRAND.line};border-radius:10px;overflow:hidden;">
  <div style="background:${BRAND.navy};padding:22px 28px;border-bottom:3px solid ${BRAND.gold};">
    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${BRAND.gold};">Urban Stone Collective</div>
    <h1 style="margin:6px 0 0;font-family:${SERIF};font-weight:600;font-size:28px;color:#fff;">Lead Sourcer Run Report</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#C9CED8;">${escapeHtml(formatEt(summary.startedAt))}</p>
  </div>
  <div style="padding:24px 28px;">
    <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 -8px 24px;"><tr>
      ${stat('Fetched', total.fetched)}${stat('Matched', total.matched)}${stat('Emailed to sales@', total.emailed)}
    </tr></table>
    <h2 style="font-family:${SERIF};font-size:21px;font-weight:600;color:${BRAND.navy};margin:0 0 8px;">Live sources</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:26px;">
      <tr style="text-align:left;"><th style="${th}">Source</th><th style="${th}">Status</th><th style="${th}text-align:right;">Fetched</th><th style="${th}text-align:right;">Matched</th><th style="${th}text-align:right;">Emailed</th></tr>
      ${sourceRows || `<tr><td colspan="5" style="${cell}color:${BRAND.muted};">No sources enabled.</td></tr>`}
    </table>
    <h2 style="font-family:${SERIF};font-size:21px;font-weight:600;color:${BRAND.navy};margin:0 0 8px;">Top leads</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="text-align:left;"><th style="${th}">Lead</th><th style="${th}">Area</th><th style="${th}text-align:right;">Est. cost</th><th style="${th}text-align:right;">Score</th></tr>
      ${leadRows}
    </table>
    ${crmHtml}
  </div>
  <div style="background:${BRAND.paper};padding:14px 28px;font-size:12px;color:${BRAND.muted};border-top:1px solid ${BRAND.line};">
    <p style="margin:0;">Run ${escapeHtml(formatEt(summary.startedAt))} &rarr; ${escapeHtml(formatEt(summary.completedAt))} &middot; mode ${escapeHtml(summary.mode)} &middot; ${durationSec}s</p>
    <p style="margin:6px 0 0;">Each lead is emailed to sales@ separately; contractors are never contacted automatically.</p>
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
        city: '',
        estimatedCost: null,
        score: Number.isFinite(match?.score) ? match.score : null,
    };
}

export function rankTopLeads(entries, limit = 10) {
    return [...entries].filter((entry) => LIVE_SOURCE_KEYS.has(entry?.source)).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, limit);
}
