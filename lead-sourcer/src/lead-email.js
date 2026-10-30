/**
 * Internal lead notification email (sales@ only) for one sourced lead.
 *
 * Brand layout: navy #0B1220 header, gold #C4A35A accents, Cormorant Garamond
 * headings and Manrope body with web-safe fallbacks. Table-based, inline
 * styles only, so it renders in Gmail/Outlook/Apple Mail. Empty fields are
 * hidden; nothing is dumped raw. A plain-text alternative is always returned.
 */

const BRAND = {
    navy: '#0B1220', gold: '#C4A35A', goldSoft: '#F3ECDD', ink: '#1B2333', muted: '#6B7280', line: '#E7E2D6', paper: '#F6F3EC',
};
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = "Manrope,'Helvetica Neue',Helvetica,Arial,sans-serif";

export const LEAD_SOURCE_LABELS = {
    'permits-hamilton': 'Hamilton County permit',
    permits: 'Cincinnati permit',
    'permits-butler': 'Butler County permit',
};

const EMPTY_VALUES = new Set(['', 'unknown', 'not listed', 'not stated', 'not in registry', 'n/a', 'none', 'anonymous']);

function clean(value) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return EMPTY_VALUES.has(text.toLowerCase()) ? '' : text;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function titleCase(value) {
    const text = clean(value);
    if (!text || text !== text.toUpperCase()) return text;
    return text.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Oh|Ky|In)\b/g, (m) => m.toUpperCase());
}

function money(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? `$${Math.round(amount).toLocaleString('en-US')}` : '';
}

function truncate(text, max) {
    const value = clean(text);
    return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** "Label: value" lines from the legacy projectDetails body, keyed by lower-case label. */
export function parseDetailLines(projectDetails) {
    const fields = {};
    for (const line of String(projectDetails || '').split('\n')) {
        const match = line.match(/^\s*([A-Za-z][A-Za-z /]{1,30}):\s*(.*)$/);
        if (match && !(match[1].toLowerCase() in fields)) fields[match[1].toLowerCase()] = match[2].trim();
    }
    return fields;
}

const PROJECT_TAGS = [
    ['Countertops', /counter ?tops?|countertop/],
    ['Kitchen', /kitchen/],
    ['Bath / vanity', /\bbath|vanit|powder room|restroom/],
    ['Addition', /\baddition/],
    ['Basement', /basement/],
    ['Commercial interior', /\boffice|tenant|commercial|retail|restaurant/],
];

/** Short project type from the work description, e.g. "Kitchen + Bath / vanity remodel". */
export function deriveProjectType(text) {
    const value = String(text || '').toLowerCase();
    const tags = PROJECT_TAGS.filter(([, re]) => re.test(value)).map(([tag]) => tag);
    const remodel = /remodel|renovat|alteration|repair/.test(value);
    if (!tags.length) return remodel ? 'Remodel' : '';
    return `${tags.join(' + ')}${remodel && !tags.includes('Addition') ? ' remodel' : ''}`;
}

/** Normalize any lead-sourcer payload into the fields the email shows. */
export function extractLeadFields(payload = {}) {
    const lead = payload.lead || {};
    const meta = payload.metadata || {};
    const permit = meta.permit || {};
    const parsed = parseDetailLines(lead.projectDetails);
    const source = String(payload.source || meta.routeId?.split('/').pop() || '');
    const description = clean(permit.description || parsed.work || meta.workSummary);
    const email = clean(lead.email);
    return {
        source,
        sourceLabel: LEAD_SOURCE_LABELS[source] || titleCase(source.replace(/[-_]/g, ' ')) || 'Lead Sourcer',
        name: clean(lead.name || parsed.contractor),
        contactRole: clean(permit.contactRole),
        contractorType: clean(permit.contractorType || parsed['contractor type']),
        phone: clean(lead.phone),
        // Placeholder addresses from the old Zap contract are never shown.
        email: /^auto\+.*@urbanstone\.co$/i.test(email) ? '' : email,
        address: titleCase(permit.address || parsed['job address']),
        city: titleCase(meta.city || parsed['city/township']),
        jurisdiction: clean(permit.jurisdiction || meta.jurisdiction),
        projectType: deriveProjectType(`${permit.recordType || parsed['record type'] || ''} ${description}`),
        recordType: clean(permit.recordType || parsed['record type']),
        valuation: money(meta.estimatedCost),
        permitNumber: clean(meta.permitNumber || parsed.permit),
        date: clean(permit.date || parsed.date || parsed.issued),
        status: clean(permit.status || parsed.status),
        description: truncate(description, 420),
        url: clean(lead.externalPostUrl),
        score: Number.isFinite(payload.score) ? payload.score : null,
        scoreBand: clean(payload.scoreBand),
        leadId: clean(payload.dedupeKey || lead.externalPostId),
    };
}

function rows(fields) {
    return [
        ['Company', fields.name],
        ['Role', [fields.contactRole, fields.contractorType].filter(Boolean).join(' · ')],
        ['Phone', fields.phone],
        ['Email', fields.email],
        ['Job address', fields.address],
        ['Area', [fields.city, fields.jurisdiction].filter(Boolean).join(' · ')],
        ['Project type', fields.projectType],
        ['Valuation', fields.valuation],
        ['Permit #', fields.permitNumber],
        ['Record type', fields.recordType],
        ['Filed', fields.date],
        ['Status', fields.status],
        ['Lead score', fields.score != null ? `${fields.score}${fields.scoreBand ? ` (${fields.scoreBand})` : ''}` : ''],
    ].filter(([, value]) => clean(value));
}

function linkFor(label, value) {
    const safe = escapeHtml(value);
    const style = `color:${BRAND.navy};text-decoration:underline;text-decoration-color:${BRAND.gold};`;
    if (label === 'Phone') return `<a href="tel:${escapeHtml(value.replace(/[^\d+]/g, ''))}" style="${style}">${safe}</a>`;
    if (label === 'Email') return `<a href="mailto:${safe}" style="${style}">${safe}</a>`;
    return safe;
}

export function buildLeadSubject(fields) {
    return ['[Lead Sourcer]', [fields.sourceLabel, fields.name || 'New lead', fields.projectType, fields.city, fields.valuation].filter(Boolean).join(' · ')].join(' ');
}

export function buildLeadEmailText(fields) {
    const lines = [
        `NEW LEAD — ${fields.sourceLabel}`,
        fields.name || 'Unnamed lead',
        '',
        ...rows(fields).map(([label, value]) => `${label}: ${value}`),
    ];
    if (fields.description) lines.push('', 'Details:', fields.description);
    if (fields.url) lines.push('', `Source record: ${fields.url}`);
    lines.push('', 'Internal lead for sales@ only. Nobody has been contacted automatically.');
    if (fields.leadId) lines.push(`Lead ID: ${fields.leadId}`);
    return lines.join('\n');
}

export function buildLeadEmailHtml(fields) {
    const chips = [fields.sourceLabel, fields.projectType].filter(Boolean)
        .map((chip) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border:1px solid ${BRAND.gold};border-radius:999px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.gold};">${escapeHtml(chip)}</span>`).join('');
    const highlights = [['Valuation', fields.valuation], ['Area', fields.city], ['Phone', fields.phone]].filter(([, v]) => v);
    const highlightCells = highlights.map(([label, value]) => `<td valign="top" style="padding:14px 16px;background:${BRAND.paper};border-top:3px solid ${BRAND.gold};width:${Math.floor(100 / highlights.length)}%;">
          <div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.muted};">${label}</div>
          <div style="font-family:${SERIF};font-size:${label === 'Phone' ? 20 : 24}px;font-weight:600;color:${BRAND.navy};line-height:1.2;margin-top:2px;">${linkFor(label, value)}</div></td>`).join('<td style="width:8px;"></td>');
    const detailRows = rows(fields).map(([label, value]) => `<tr>
          <td valign="top" style="padding:9px 0;border-bottom:1px solid ${BRAND.line};width:130px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(label)}</td>
          <td valign="top" style="padding:9px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;color:${BRAND.ink};">${linkFor(label, value)}</td></tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(buildLeadSubject(fields))}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Manrope:wght@400;600&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${BRAND.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:10px;overflow:hidden;font-family:${SANS};color:${BRAND.ink};">
    <tr><td style="background:${BRAND.navy};padding:24px 28px 20px;border-bottom:3px solid ${BRAND.gold};">
      <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.gold};">Urban Stone Collective · New lead</div>
      <div style="font-family:${SERIF};font-size:30px;font-weight:600;line-height:1.15;color:#ffffff;margin:8px 0 12px;">${escapeHtml(fields.name || 'Unnamed lead')}</div>
      ${chips}
    </td></tr>
    ${highlights.length ? `<tr><td style="padding:22px 28px 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${highlightCells}</tr></table></td></tr>` : ''}
    ${fields.description ? `<tr><td style="padding:18px 28px 0;">
      <div style="font-family:${SERIF};font-size:19px;font-weight:600;color:${BRAND.navy};margin-bottom:6px;">Scope of work</div>
      <div style="font-size:14px;line-height:1.6;color:${BRAND.ink};">${escapeHtml(fields.description)}</div></td></tr>` : ''}
    <tr><td style="padding:18px 28px 8px;">
      <div style="font-family:${SERIF};font-size:19px;font-weight:600;color:${BRAND.navy};margin-bottom:4px;">Lead details</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows}</table>
    </td></tr>
    ${fields.url ? `<tr><td style="padding:16px 28px 6px;">
      <a href="${escapeHtml(fields.url)}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.navy};font-weight:600;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:6px;">Open ${fields.permitNumber ? 'permit record' : 'source'} &rarr;</a></td></tr>` : ''}
    <tr><td style="padding:18px 28px 22px;font-size:12px;line-height:1.5;color:${BRAND.muted};">
      Internal lead for sales@ only. Nobody has been contacted automatically.${fields.leadId ? `<br>Lead ID: ${escapeHtml(fields.leadId)}` : ''}
    </td></tr>
  </table>
  <div style="font-family:${SANS};font-size:11px;color:${BRAND.muted};padding-top:12px;">Urban Stone Collective · Cincinnati, OH · <a href="https://urbanstone.co" style="color:${BRAND.muted};">urbanstone.co</a></div>
</td></tr></table>
</body>
</html>`;
}

/** { subject, html, text } for one lead payload. */
export function buildLeadNotification(payload) {
    const fields = extractLeadFields(payload);
    return { subject: buildLeadSubject(fields), html: buildLeadEmailHtml(fields), text: buildLeadEmailText(fields), fields };
}
