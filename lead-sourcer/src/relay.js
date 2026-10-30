/**
 * Relay a payload to the sales inbox.
 * Delivery is Resend email only. The Zapier catch-hook was retired on
 * 2026-10-30. LEAD_WEBHOOK_URL is ignored. See docs/RETIRED-zapier.md.
 * Lead emails use the branded layout in lead-email.js (HTML + plain text).
 */
import { buildLeadNotification } from './lead-email.js';

function buildDefaultResendContent(payload) {
    const { subject, text, html } = buildLeadNotification(payload);
    return { subject, text, html };
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

    // Leads are internal notifications only. Never deliver to the lead's own
    // address (e.g. a contractor email from the permits registry enrichment).
    const leadEmail = String(payload?.lead?.email || '').trim().toLowerCase();
    const recipients = defaultTo.toLowerCase().split(/[,;]/).map((value) => value.replace(/^.*</, '').replace(/>.*$/, '').trim());
    if (leadEmail && recipients.includes(leadEmail)) {
        throw new Error('refusing to email the lead contact; recipient must be the internal sales inbox');
    }

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
    const errors = [];
    let resendSent = false;

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

    if (!resendSent) {
        throw new Error(`Relay failed: ${errors.join(' | ') || 'resend did not send'}`);
    }

    return {
        resendSent,
        webhookSent: false,
    };
}

/**
 * Relay one sourced lead and only mark it seen after a channel accepted it.
 * A failed relay no longer aborts the whole poller (which previously dropped
 * every remaining candidate) and no longer burns the dedup entry, so the lead
 * is retried on the next scheduled run.
 */
export async function deliverLead(payload, { postId, markSeen, stats, relayFn = relay }) {
    try {
        await relayFn(payload);
        if (postId && typeof markSeen === 'function') markSeen(postId);
        return true;
    } catch (error) {
        if (stats) {
            stats.relayFailures = (stats.relayFailures || 0) + 1;
            stats.status = 'degraded';
        }
        console.warn(`[relay] Lead ${postId || payload?.dedupeKey || 'unknown'} not delivered; will retry next run: ${error?.message || error}`);
        return false;
    }
}
