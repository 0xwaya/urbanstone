// Direct Resend delivery for website, chat, and contractor-estimate leads
// (replaces the Zapier catch-hook relay).
// Layout mirrors the former Zap "Outlook Send Email" step:
//   Subject: Lead: {Source} | {Lead Name}
//   Body:    Name / Email / Phone / Details

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WEBSITE_LEAD_SOURCE = 'Website';
export const CHAT_LEAD_SOURCE = 'Chat';
export const CONTRACTOR_ESTIMATE_LEAD_SOURCE = 'Contractor Estimate';
export const DEFAULT_LEAD_TO = 'sales@urbanstone.co';
export const DEFAULT_LEAD_FROM = 'Urban Stone <sales@urbanstone.co>';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatList(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean).join(', ');
    }
    return value ?? '';
}

function buildSpecRows(payload) {
    const lead = payload.lead || {};
    return [
        ['Total sq ft', lead.totalSquareFootage ?? ''],
        ['Remove current tops', lead.currentTopRemoval],
        ['Current top material', lead.currentTopMaterial],
        ['Sink basin', lead.sinkBasinPreference],
        ['Sink mount', lead.sinkMountPreference],
        ['Sink material', lead.sinkMaterialPreference],
        ['Backsplash', lead.backsplashPreference],
        ['Timeframe', lead.timeframeGoal],
        ['Materials', formatList(lead.materialPreferences)],
        ['Drawing', lead.drawingImage ? `attached (${lead.drawingImage.name || 'drawing'})` : ''],
        ['Page', payload.routeId],
        ['Submitted', payload.submittedAt],
        ['Request ID', payload.requestId],
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
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
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
        .map(([label, value]) => [label, Array.isArray(value) ? formatList(value) : value]);
}

// Generic lead email: Subject "Lead: {source} | {name}", body Name / Email / Phone / Details,
// then an optional specs block. Used by the website form, chat intake, and contractor estimates.
export function buildLeadEmail({ source, name = '', email = '', phone = '', details = '', specRows = [], specsTitle = 'Project specs', attachments = [] }, env = process.env) {
    const rows = buildSpecTable(specRows);
    const subject = `Lead: ${source} | ${name}`;

    const text = [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Details: ${details}`,
        ...(rows.length ? ['', specsTitle, ...rows.map(([label, value]) => `${label}: ${value}`)] : []),
    ].join('\n');

    const specsHtml = rows.length
        ? `
  <p style="margin:0 0 6px;font-weight:bold;">${escapeHtml(specsTitle)}</p>
  <table cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
    ${rows.map(([label, value]) => `<tr><td style="color:#555;padding-right:12px;vertical-align:top;">${escapeHtml(label)}</td><td style="white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`).join('\n    ')}
  </table>`
        : '';

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;">
  <p style="margin:0 0 6px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
  <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
  <p style="margin:0 0 6px;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
  <p style="margin:0 0 16px;white-space:pre-wrap;"><strong>Details:</strong> ${escapeHtml(details)}</p>${specsHtml}
</div>`.trim();

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

export function buildWebsiteLeadEmail(payload, env = process.env) {
    const lead = payload.lead || {};
    const attachment = parseDrawingAttachment(lead.drawingImage);
    return buildLeadEmail({
        source: WEBSITE_LEAD_SOURCE,
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        details: lead.projectDetails || '',
        specRows: buildSpecRows(payload),
        attachments: attachment ? [attachment] : [],
    }, env);
}

export async function sendWebsiteLeadEmail(payload, env = process.env, fetchImpl = fetch) {
    return sendLeadEmail(buildWebsiteLeadEmail(payload, env), {
        idempotencyKey: `website-lead-${payload.dedupeKey}-${payload.requestId}`,
        env,
        fetchImpl,
    });
}

export function buildChatLeadEmail(payload, env = process.env) {
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
        specsTitle: 'Chat intake',
        specRows: [
            ['Segment', chat.customerSegment],
            ['City', chat.city],
            ['Project type', chat.projectType],
            ['Project phase', chat.projectPhase],
            ['Project status', chat.projectStatus],
            ['Total sq ft', lead.totalSquareFootage],
            ['Budget', chat.tentativeBudget],
            ['Material', chat.material],
            ['Material group', chat.materialGroup],
            ['Supplier', chat.supplier],
            ['Timeline', chat.timeline],
            ['Summary', chat.summary],
            ['Follow-up', chat.ownerFollowUp],
            ['Transcript', transcript],
            ['Submitted', payload.submittedAt],
            ['Request ID', payload.requestId],
        ],
    }, env);
}

export function buildContractorEstimateEmail(payload, env = process.env) {
    const estimate = payload.estimate || {};
    return buildLeadEmail({
        source: CONTRACTOR_ESTIMATE_LEAD_SOURCE,
        name: estimate.name || '',
        email: estimate.email || '',
        phone: estimate.phone || '',
        details: estimate.projectDetails || '',
        specsTitle: 'Commercial estimate',
        specRows: [
            ['Company', estimate.companyName],
            ['Project', estimate.projectName],
            ['Location', estimate.projectLocation],
            ['Property type', estimate.propertyType],
            ['Units', estimate.numberOfUnits],
            ['Avg unit sq ft', estimate.averageUnitSquareFootage],
            ['Units per week', estimate.unitsPerWeek],
            ['Fabrication lead (weeks)', estimate.fabricationLeadWeeks],
            ['Installation lead (weeks)', estimate.installationLeadWeeks],
            ['Start date', estimate.projectStartDate],
            ['Completion goal', estimate.completionGoal],
            ['Materials', estimate.materialInterests],
            ['Page', payload.routeId],
            ['Submitted', payload.submittedAt],
            ['Request ID', payload.requestId],
        ],
    }, env);
}
