/**
 * Relay a payload to notification backends.
 * Primary channel: Resend email. Secondary channel: webhook (Zap).
 */
import { toZapReadyPayload } from './core/field-mapping.js';

function envFlag(name, defaultValue = true) {
    const raw = String(process.env[name] || '').trim().toLowerCase();
    if (!raw) return defaultValue;
    return !['0', 'false', 'no', 'off'].includes(raw);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildDefaultResendContent(payload) {
    const routeId = payload?.metadata?.routeId || 'lead-sourcer/unknown';
    const source = payload?.source || 'lead-sourcer';
    const submittedAt = payload?.submittedAt || new Date().toISOString();
    const lead = payload?.lead || {};

    const subject = `[Lead Sourcer] ${routeId}`;
    const text = [
        `[LEAD SOURCER ALERT]`,
        ``,
        `Route: ${routeId}`,
        `Source: ${source}`,
        `Submitted: ${submittedAt}`,
        `Name: ${lead.name || ''}`,
        `Email: ${lead.email || ''}`,
        `Phone: ${lead.phone || ''}`,
        `URL: ${lead.externalPostUrl || ''}`,
        ``,
        `${lead.projectDetails || ''}`,
    ].join('\n');
    const html = `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; white-space: pre-wrap;">${escapeHtml(text)}</pre>`;

    return { subject, text, html };
}

async function sendViaWebhook(zapPayload) {
    const webhookUrl = String(process.env.LEAD_WEBHOOK_URL || '').trim();
    if (!webhookUrl) {
        console.warn('[relay] LEAD_WEBHOOK_URL not set; skipping webhook relay.');
        return { sent: false, reason: 'missing_webhook_url' };
    }

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zapPayload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Webhook relay failed: ${response.status} ${text}`);
    }

    console.log(`[relay] Webhook sent from ${zapPayload.metadata?.routeId} -> ${response.status}`);
    return { sent: true };
}

async function sendViaResend(payload, resendOverride = {}) {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
        return { sent: false, reason: 'missing_resend_api_key' };
    }

    const defaultTo = String(
        resendOverride.to
        || payload?.metadata?.reportRecipientEmail
        || process.env.LEAD_SOURCER_ALERT_EMAIL
        || process.env.LEAD_SOURCER_RUN_REPORT_EMAIL
        || 'sales@urbanstone.co',
    ).trim();
    const defaultFrom = String(
        resendOverride.from
        || process.env.LEAD_SOURCER_EMAIL_FROM
        || process.env.LEAD_SOURCER_RUN_REPORT_EMAIL_FROM
        || 'Urban Stone <sales@urbanstone.co>',
    ).trim();

    const defaults = buildDefaultResendContent(payload);
    const subject = String(resendOverride.subject || defaults.subject).trim();
    const text = String(resendOverride.text || defaults.text);
    const html = String(resendOverride.html || defaults.html);

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: defaultFrom,
            to: [defaultTo],
            subject,
            text,
            html,
        }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Resend relay failed: ${response.status} ${detail}`);
    }

    const data = await response.json().catch(() => ({}));
    console.log(`[relay] Resend emailed from ${payload?.metadata?.routeId || payload?.source || 'lead-sourcer'} (id=${data?.id || 'n/a'})`);
    return { sent: true, id: data?.id || null };
}

export async function relay(payload, options = {}) {
    const zapPayload = toZapReadyPayload(payload);
    const resendPrimary = envFlag('LEAD_SOURCER_RESEND_PRIMARY', true);
    const webhookSecondary = envFlag('LEAD_SOURCER_WEBHOOK_SECONDARY', true);
    const errors = [];
    let resendSent = false;
    let webhookSent = false;

    if (resendPrimary) {
        try {
            const resendResult = await sendViaResend(payload, options?.resend || {});
            resendSent = Boolean(resendResult?.sent);
            if (!resendSent) {
                console.warn(`[relay] Resend skipped (${resendResult?.reason || 'unknown_reason'})`);
            }
        } catch (error) {
            errors.push(`resend: ${error?.message || error}`);
            console.warn('[relay] Resend failed:', error?.message || error);
        }
    }

    if (webhookSecondary) {
        try {
            const webhookResult = await sendViaWebhook(zapPayload);
            webhookSent = Boolean(webhookResult?.sent);
        } catch (error) {
            errors.push(`webhook: ${error?.message || error}`);
            console.warn('[relay] Webhook failed:', error?.message || error);
        }
    }

    if (!resendSent && !webhookSent) {
        throw new Error(`Relay failed: ${errors.join(' | ') || 'no delivery channel succeeded'}`);
    }

    return {
        resendSent,
        webhookSent,
    };
}
