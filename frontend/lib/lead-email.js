// Direct Resend delivery for website, chat, and contractor-estimate leads
// (replaces the Zapier catch-hook relay).
// Subject keeps the format accepted for the former Zap (Oct 28):
//   Subject: Lead: {Source} | {Lead Name}
//   Text:    Name / Email / Phone / Details first, then the rest.
// HTML uses the branded layout of the lead-sourcer lead email (navy #0B1220
// header, gold #C4A35A accents, Cormorant Garamond / Manrope with web-safe
// fallbacks, table-based with inline styles). Empty fields are hidden. No IP
// address or browser info is ever shown.

import { leadOptionSets } from '../../shared/lead-form.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WEBSITE_LEAD_SOURCE = 'Website';
export const CHAT_LEAD_SOURCE = 'Chat';
export const CONTRACTOR_ESTIMATE_LEAD_SOURCE = 'Contractor Estimate';
export const DEFAULT_LEAD_TO = 'sales@urbanstone.co';
export const DEFAULT_LEAD_FROM = 'Urban Stone <sales@urbanstone.co>';
export const LOGO_URL = 'https://www.urbanstone.co/brand/urban-stone-seal-512.png';

const BRAND = {
    navy: '#0B1220', gold: '#C4A35A', ink: '#1B2333', muted: '#6B7280', line: '#E7E2D6', paper: '#F6F3EC',
};
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = "Manrope,'Helvetica Neue',Helvetica,Arial,sans-serif";

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function present(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
}

function formatList(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean).join(', ');
    }
    return value ?? '';
}

/** Form option value -> its label ("daltile-kodiak" -> "Kodiak (Daltile)"). */
function optionLabel(setName, value) {
    const option = (leadOptionSets[setName] || []).find((entry) => entry.value === value);
    return option ? option.label : value;
}

/** ISO timestamp -> "Oct 30, 2026, 3:15 PM ET". Falls back to the raw value. */
export function formatEasternTime(value) {
    const date = new Date(value);
    if (!present(value) || Number.isNaN(date.getTime())) {
        return present(value) ? String(value) : '';
    }
    const text = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(date);
    return `${text} ET`;
}

/** Footer line from a saveCrmIntake result. */
export function crmStatusLine(crm) {
    if (crm?.ok && crm.data?.intake_id) {
        const repeat = crm.data.is_repeat ? ` · repeat contact (${crm.data.prior_intakes} earlier intake${crm.data.prior_intakes === 1 ? '' : 's'})` : '';
        return `Saved to CRM · intake ${crm.data.intake_id}${repeat}`;
    }
    return 'CRM: not saved';
}

function cityZip(city, zip) {
    const c = String(city || '').trim();
    const z = String(zip || '').trim();
    if (z && c.includes(z)) return c;
    return [c, z].filter(Boolean).join(' ');
}

function linkFor(kind, value) {
    const safe = escapeHtml(value);
    const style = `color:${BRAND.navy};text-decoration:underline;text-decoration-color:${BRAND.gold};`;
    if (kind === 'phone') {
        const digits = String(value).replace(/[^\d+]/g, '');
        return digits ? `<a href="tel:${escapeHtml(digits)}" style="${style}">${safe}</a>` : safe;
    }
    if (kind === 'email' && EMAIL_PATTERN.test(String(value))) {
        return `<a href="mailto:${safe}" style="${style}">${safe}</a>`;
    }
    return safe;
}

function buildSpecRows(payload) {
    const lead = payload.lead || {};
    return [
        ['Total sq ft', lead.totalSquareFootage ?? ''],
        ['Remove current tops', lead.currentTopRemoval ? optionLabel('removal', lead.currentTopRemoval) : ''],
        ['Current top material', lead.currentTopMaterial ? optionLabel('currentTopMaterial', lead.currentTopMaterial) : ''],
        ['Sink basin', lead.sinkBasinPreference ? optionLabel('sinkBasin', lead.sinkBasinPreference) : ''],
        ['Sink mount', lead.sinkMountPreference ? optionLabel('sinkMount', lead.sinkMountPreference) : ''],
        ['Sink material', lead.sinkMaterialPreference ? optionLabel('sinkMaterial', lead.sinkMaterialPreference) : ''],
        ['Backsplash', lead.backsplashPreference ? optionLabel('backsplash', lead.backsplashPreference) : ''],
        ['Timeframe', lead.timeframeGoal ? optionLabel('timeframe', lead.timeframeGoal) : ''],
        ['Drawing', lead.drawingImage ? `attached (${lead.drawingImage.name || 'drawing'})` : ''],
    ];
}

function parseDrawingAttachment(drawingImage) {
    if (!drawingImage || typeof drawingImage.dataUrl !== 'string') {
        return null;
    }
    const match = drawingImage.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        return null;
    }
    const filename = String(drawingImage.name || 'drawing').replace(/[^\w.\-]+/g, '_').slice(0, 100) || 'drawing';
    return { filename, content: match[2] };
}

function buildSpecTable(specRows) {
    return specRows
        .filter(([, value]) => present(Array.isArray(value) ? formatList(value) : value))
        .map(([label, value]) => [label, Array.isArray(value) ? formatList(value) : String(value)]);
}

function renderHtml({ subject, source, name, email, phone, details, area, areaLabel, projectType, material, rows, specsTitle, channelLine, received, crmLine }) {
    const chips = [source, projectType].filter(present)
        .map((chip) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border:1px solid ${BRAND.gold};border-radius:999px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.gold};">${escapeHtml(chip)}</span>`).join('');
    const contactRows = [
        ['Name', escapeHtml(name)],
        ['Email', present(email) ? linkFor('email', email) : ''],
        ['Phone', present(phone) ? linkFor('phone', phone) : ''],
        [areaLabel, escapeHtml(area)],
        ['Project', escapeHtml(projectType)],
        ['Material', escapeHtml(material)],
    ].filter(([, value]) => present(value));
    const row = (label, valueHtml) => `<tr>
          <td valign="top" style="padding:9px 0;border-bottom:1px solid ${BRAND.line};width:130px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(label)}</td>
          <td valign="top" style="padding:9px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;color:${BRAND.ink};white-space:pre-wrap;">${valueHtml}</td></tr>`;
    const section = (title, inner) => `<tr><td style="padding:18px 28px 4px;">
      <div style="font-family:${SERIF};font-size:19px;font-weight:600;color:${BRAND.navy};margin-bottom:4px;">${escapeHtml(title)}</div>
      ${inner}</td></tr>`;
    const quick = [
        present(phone) ? `<a href="tel:${escapeHtml(String(phone).replace(/[^\d+]/g, ''))}" style="display:inline-block;margin:0 8px 8px 0;background:${BRAND.gold};color:${BRAND.navy};font-weight:600;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:6px;">Call ${escapeHtml(phone)}</a>` : '',
        EMAIL_PATTERN.test(String(email || '')) ? `<a href="mailto:${escapeHtml(email)}" style="display:inline-block;margin:0 8px 8px 0;border:1px solid ${BRAND.gold};color:${BRAND.navy};font-weight:600;font-size:14px;text-decoration:none;padding:10px 20px;border-radius:6px;">Reply by email</a>` : '',
    ].join('');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Manrope:wght@400;600&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${BRAND.paper};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:10px;overflow:hidden;font-family:${SANS};color:${BRAND.ink};">
    <tr><td style="background:${BRAND.navy};padding:22px 28px 18px;border-bottom:3px solid ${BRAND.gold};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" style="width:60px;padding-right:14px;"><img src="${LOGO_URL}" width="56" height="56" alt="Urban Stone Collective" style="display:block;border:0;width:56px;height:56px;"></td>
        <td valign="middle">
          <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.gold};">Urban Stone Collective · New ${escapeHtml(source.toLowerCase())} lead</div>
          <div style="font-family:${SERIF};font-size:30px;font-weight:600;line-height:1.15;color:#ffffff;margin:6px 0 0;">${escapeHtml(name || 'Unnamed lead')}</div>
        </td></tr></table>
      <div style="margin-top:12px;">${chips}</div>
    </td></tr>
    ${section('Contact', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${contactRows.map(([label, value]) => row(label, value)).join('')}</table>`)}
    ${quick ? `<tr><td style="padding:14px 28px 0;">${quick}</td></tr>` : ''}
    ${present(details) ? section('Project details', `<div style="font-size:14px;line-height:1.6;color:${BRAND.ink};white-space:pre-wrap;">${escapeHtml(details)}</div>`) : ''}
    ${rows.length ? section(specsTitle, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(([label, value]) => row(label, escapeHtml(value))).join('')}</table>`) : ''}
    <tr><td style="padding:18px 28px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('Source', escapeHtml(channelLine))}
        ${present(received) ? row('Received', escapeHtml(received)) : ''}
      </table></td></tr>
    <tr><td style="padding:16px 28px 22px;">
      <div style="display:inline-block;padding:6px 12px;border-radius:6px;background:${BRAND.paper};border-left:3px solid ${BRAND.gold};font-size:12px;color:${BRAND.ink};">${escapeHtml(crmLine)}</div>
      <div style="font-size:12px;line-height:1.5;color:${BRAND.muted};margin-top:10px;">Internal lead for sales@ only. The customer has not been contacted automatically.</div>
    </td></tr>
  </table>
  <div style="font-family:${SANS};font-size:11px;color:${BRAND.muted};padding-top:12px;">Urban Stone Collective · Cincinnati, OH · <a href="https://urbanstone.co" style="color:${BRAND.muted};">urbanstone.co</a></div>
</td></tr></table>
</body>
</html>`;
}

// Generic lead email: Subject "Lead: {source} | {name}". Used by the website
// form, chat intake, and contractor estimates. `crm` is the saveCrmIntake result
// (optional); the email never depends on it beyond the footer line.
export function buildLeadEmail({
    source, name = '', email = '', phone = '', details = '', city = '', zip = '', projectType = '', material = '',
    areaLabel = 'City / ZIP', specRows = [], specsTitle = 'Project specs', attachments = [], channel = '', submittedAt = '', crm = null,
}, env = process.env) {
    const rows = buildSpecTable(specRows);
    const subject = `Lead: ${source} | ${name}`;
    const area = cityZip(city, zip);
    const materialText = formatList(material);
    const channelLine = [source, channel].filter(present).join(' · ');
    const received = formatEasternTime(submittedAt);
    const crmLine = crmStatusLine(crm);

    const text = [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Details: ${details}`,
        ...(present(area) ? [`${areaLabel.replace(' / ', '/')}: ${area}`] : []),
        ...(present(projectType) ? [`Project: ${projectType}`] : []),
        ...(present(materialText) ? [`Material: ${materialText}`] : []),
        ...(rows.length ? ['', specsTitle, ...rows.map(([label, value]) => `${label}: ${value}`)] : []),
        '',
        `Source: ${channelLine}`,
        ...(present(received) ? [`Received: ${received}`] : []),
        crmLine,
    ].join('\n');

    const html = renderHtml({ subject, source, name, email, phone, details, area, areaLabel, projectType, material: materialText, rows, specsTitle, channelLine, received, crmLine });

    const message = {
        from: String(env.LEAD_EMAIL_FROM || DEFAULT_LEAD_FROM).trim(),
        to: [String(env.LEAD_EMAIL_TO || DEFAULT_LEAD_TO).trim()],
        subject,
        text,
        html,
    };

    if (EMAIL_PATTERN.test(String(email || ''))) {
        message.reply_to = email;
    }

    if (attachments.length) {
        message.attachments = attachments;
    }

    return message;
}

export async function sendLeadEmail(message, { idempotencyKey, env = process.env, fetchImpl = fetch } = {}) {
    const apiKey = String(env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
        const error = new Error('RESEND_API_KEY is not configured');
        error.code = 'missing_resend_api_key';
        throw error;
    }

    const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };
    if (idempotencyKey) {
        headers['Idempotency-Key'] = String(idempotencyKey).slice(0, 256);
    }

    const response = await fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(8000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.id) {
        throw new Error(`Resend rejected lead email: ${response.status} ${data?.name || ''} ${data?.message || ''}`.trim());
    }

    return { id: data.id };
}

export function buildWebsiteLeadEmail(payload, env = process.env, crm = null) {
    const lead = payload.lead || {};
    const attachment = parseDrawingAttachment(lead.drawingImage);
    const materials = Array.isArray(lead.materialPreferences) ? lead.materialPreferences.map((value) => optionLabel('materials', value)) : [];
    return buildLeadEmail({
        source: WEBSITE_LEAD_SOURCE,
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        details: lead.projectDetails || '',
        projectType: 'Countertops',
        material: materials,
        specRows: buildSpecRows(payload),
        channel: `quote form${payload.routeId ? ` (${payload.routeId})` : ''}`,
        submittedAt: payload.submittedAt,
        crm,
        attachments: attachment ? [attachment] : [],
    }, env);
}

export async function sendWebsiteLeadEmail(payload, env = process.env, fetchImpl = fetch, crm = null) {
    return sendLeadEmail(buildWebsiteLeadEmail(payload, env, crm), {
        idempotencyKey: `website-lead-${payload.dedupeKey}-${payload.requestId}`,
        env,
        fetchImpl,
    });
}

export function buildChatLeadEmail(payload, env = process.env, crm = null) {
    const lead = payload.lead || {};
    const chat = payload.chatIntake || {};
    const transcript = Array.isArray(chat.transcript)
        ? chat.transcript.map((entry) => `${entry?.role || 'user'}: ${entry?.content || ''}`).join('\n')
        : '';
    return buildLeadEmail({
        source: CHAT_LEAD_SOURCE,
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        details: lead.projectDetails || chat.summary || '',
        city: chat.city || '',
        projectType: chat.projectType || '',
        material: chat.material || '',
        channel: 'website chat',
        submittedAt: payload.submittedAt,
        crm,
        specsTitle: 'Chat intake',
        specRows: [
            ['Segment', chat.customerSegment],
            ['Project phase', chat.projectPhase],
            ['Project status', chat.projectStatus],
            ['Total sq ft', lead.totalSquareFootage],
            ['Budget', chat.tentativeBudget],
            ['Material group', chat.materialGroup],
            ['Supplier', chat.supplier],
            ['Timeline', chat.timeline],
            ['Summary', chat.summary],
            ['Follow-up', chat.ownerFollowUp],
            ['Transcript', transcript],
        ],
    }, env);
}

export function buildContractorEstimateEmail(payload, env = process.env, crm = null) {
    const estimate = payload.estimate || {};
    return buildLeadEmail({
        source: CONTRACTOR_ESTIMATE_LEAD_SOURCE,
        name: estimate.name || '',
        email: estimate.email || '',
        phone: estimate.phone || '',
        details: estimate.projectDetails || '',
        city: estimate.projectLocation || '',
        areaLabel: 'Location',
        projectType: estimate.propertyType || '',
        material: estimate.materialInterests || '',
        channel: `contractor portal${payload.routeId ? ` (${payload.routeId})` : ''}`,
        submittedAt: payload.submittedAt,
        crm,
        specsTitle: 'Commercial estimate',
        specRows: [
            ['Company', estimate.companyName],
            ['Project', estimate.projectName],
            ['Units', estimate.numberOfUnits],
            ['Avg unit sq ft', estimate.averageUnitSquareFootage],
            ['Units per week', estimate.unitsPerWeek],
            ['Fabrication lead (weeks)', estimate.fabricationLeadWeeks],
            ['Installation lead (weeks)', estimate.installationLeadWeeks],
            ['Start date', estimate.projectStartDate],
            ['Completion goal', estimate.completionGoal],
        ],
    }, env);
}
