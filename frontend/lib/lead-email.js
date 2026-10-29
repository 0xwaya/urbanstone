// Direct Resend delivery for website leads (replaces the Zapier catch-hook relay).
// Layout mirrors the former Zap "Outlook Send Email" step:
//   Subject: Lead: {Source} | {Lead Name}
//   Body:    Name / Email / Phone / Details

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WEBSITE_LEAD_SOURCE = 'Website';
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

export function buildWebsiteLeadEmail(payload, env = process.env) {
    const lead = payload.lead || {};
    const source = WEBSITE_LEAD_SOURCE;
    const name = lead.name || '';
    const details = lead.projectDetails || '';
    const specRows = buildSpecRows(payload);

    const subject = `Lead: ${source} | ${name}`;

    const text = [
        `Name: ${name}`,
        `Email: ${lead.email || ''}`,
        `Phone: ${lead.phone || ''}`,
        `Details: ${details}`,
        '',
        'Project specs',
        ...specRows.map(([label, value]) => `${label}: ${value}`),
    ].join('\n');

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111;">
  <p style="margin:0 0 6px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
  <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(lead.email || '')}</p>
  <p style="margin:0 0 6px;"><strong>Phone:</strong> ${escapeHtml(lead.phone || '')}</p>
  <p style="margin:0 0 16px;white-space:pre-wrap;"><strong>Details:</strong> ${escapeHtml(details)}</p>
  <p style="margin:0 0 6px;font-weight:bold;">Project specs</p>
  <table cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
    ${specRows.map(([label, value]) => `<tr><td style="color:#555;padding-right:12px;">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('\n    ')}
  </table>
</div>`.trim();

    const message = {
        from: String(env.LEAD_EMAIL_FROM || DEFAULT_LEAD_FROM).trim(),
        to: [String(env.LEAD_EMAIL_TO || DEFAULT_LEAD_TO).trim()],
        subject,
        text,
        html,
    };

    if (EMAIL_PATTERN.test(String(lead.email || ''))) {
        message.reply_to = lead.email;
    }

    const attachment = parseDrawingAttachment(lead.drawingImage);
    if (attachment) {
        message.attachments = [attachment];
    }

    return message;
}

export async function sendWebsiteLeadEmail(payload, env = process.env, fetchImpl = fetch) {
    const apiKey = String(env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
        const error = new Error('RESEND_API_KEY is not configured');
        error.code = 'missing_resend_api_key';
        throw error;
    }

    const message = buildWebsiteLeadEmail(payload, env);
    const response = await fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `website-lead-${payload.dedupeKey}-${payload.requestId}`.slice(0, 256),
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(8000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.id) {
        throw new Error(`Resend rejected lead email: ${response.status} ${data?.name || ''} ${data?.message || ''}`.trim());
    }

    return { id: data.id };
}
