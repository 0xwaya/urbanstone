import { randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { getClientIp } from './lead';
import { normalizeEmail } from './contractor-access';
import { getContractorEmailFrom } from './contractor-portal';

const DEFAULT_CONTRACTOR_NOTIFICATION_EMAILS = ['sales@urbanstone.co'];
const DEFAULT_APPROVAL_DASHBOARD_URL = 'https://urbanstone.co/admin/contractors';

const FLAG_LABELS = {
    website_unreachable: 'Website unreachable',
    no_website: 'No website given',
    gibberish_name: 'Company name looks random',
    gibberish_email: 'Email looks random',
    dotted_gmail: 'Gmail with many dots (common bot pattern)',
    gibberish_domain: 'Website domain looks random',
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function normalizeField(value, maxLength) {
    return String(value || '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function parseEmailList(value) {
    return String(value || '')
        .split(',')
        .map(entry => normalizeEmail(entry))
        .filter(Boolean);
}

export function getContractorNotificationEmails(env = process.env) {
    const configured = parseEmailList(env.CONTRACTOR_NOTIFICATION_EMAILS);
    const backup = parseEmailList(env.CONTRACTOR_NOTIFICATION_BACKUP_EMAILS);
    const primary = configured.length > 0 ? configured : DEFAULT_CONTRACTOR_NOTIFICATION_EMAILS;

    return [...new Set([...primary, ...backup])];
}

export function buildContractorRegistrationEvent(contractor, request) {
    const requestId = normalizeField(request?.headers?.['x-request-id'] || randomUUID(), 64);
    const companyName = normalizeField(contractor.company_name, 120);
    const normalizedEmail = normalizeEmail(contractor.email);
    const website = normalizeField(contractor.website, 512);
    const approvalState = contractor.status || (contractor.approved ? 'approved' : 'pending');
    const riskFlags = Array.isArray(contractor.risk_flags) ? contractor.risk_flags.map(flag => normalizeField(flag, 40)) : [];

    return {
        type: 'contractor_registration',
        eventId: randomUUID(),
        submittedAt: new Date().toISOString(),
        source: 'urban-stone-contractor-portal',
        requestId,
        contractor: {
            id: contractor.id || null,
            email: normalizedEmail,
            company_name: companyName,
            website,
            approved: Boolean(contractor.approved),
            approval_state: approvalState,
            email_verified: Boolean(contractor.email_verified),
            risk_flags: riskFlags,
            created_at: contractor.created_at || null,
        },
        mailingListRow: {
            email: normalizedEmail,
            company_name: companyName,
            website,
            approval_state: approvalState,
            created_at: contractor.created_at || new Date().toISOString(),
        },
        metadata: {
            requestId,
            ip: getClientIp(request),
            userAgent: request?.headers?.['user-agent'] || 'unknown',
            referer: request?.headers?.referer || null,
        },
    };
}

export async function relayContractorRegistrationEvent(event, webhookUrl) {
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
        throw new Error(`Contractor registration relay failed with status ${response.status}`);
    }
}

function renderContractorRegistrationNotification(event, approvalDashboardUrl) {
    const contractor = event.contractor;
    const statusLabel = contractor.approved ? 'Approved (pre-vetted email)' : 'Pending your approval';
    const verifiedLabel = contractor.email_verified ? 'Verified' : 'UNVERIFIED';
    const flagsLabel = contractor.risk_flags?.length
        ? contractor.risk_flags.map(flag => FLAG_LABELS[flag] || flag).join(', ')
        : 'None';
    const dashboardMarkup = approvalDashboardUrl
        ? `<p style="margin:24px 0 0;"><a href="${approvalDashboardUrl}" style="display:inline-block;padding:12px 18px;background:#4a90e2;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;">Open approval dashboard</a></p>`
        : '';

    return `
      <div style="font-family:Manrope,Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px;background:#0c1220;color:#e7eef8;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#a8afc0;">New contractor registration</p>
        <h2 style="margin:0 0 16px;font-size:28px;line-height:1.1;color:#ffffff;">${escapeHtml(contractor.company_name)}</h2>
        <p style="margin:0 0 24px;color:#cdd9ea;">A contractor confirmed their email and is waiting for portal access. Nothing is unlocked until you approve them in the dashboard.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;background:#101829;border:1px solid #344866;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#a8afc0;width:180px;">Business email</td>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#ffffff;">${escapeHtml(contractor.email)}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#a8afc0;">Website</td>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#ffffff;">${escapeHtml(contractor.website || '—')}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#a8afc0;">Status</td>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#ffffff;">${statusLabel}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#a8afc0;">Email</td>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#ffffff;">${verifiedLabel}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:#a8afc0;">Warnings</td>
            <td style="padding:14px 16px;border-bottom:1px solid #344866;color:${contractor.risk_flags?.length ? '#ffb4a8' : '#ffffff'};">${escapeHtml(flagsLabel)}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;color:#a8afc0;">Submitted</td>
            <td style="padding:14px 16px;color:#ffffff;">${event.submittedAt}</td>
          </tr>
        </table>
        ${dashboardMarkup}
        <p style="margin:24px 0 0;color:#8fa2bf;font-size:12px;">Event ID: ${event.eventId}</p>
      </div>
    `;
}

export async function sendContractorRegistrationNotification(event, env = process.env) {
    const resendKey = env.RESEND_API_KEY;
    const recipients = getContractorNotificationEmails(env);

    if (!resendKey || recipients.length === 0) {
        return {
            skipped: true,
            reason: !resendKey ? 'missing_resend_key' : 'missing_notification_recipient',
        };
    }

    const resend = new Resend(resendKey);
    const warn = event.contractor.risk_flags?.length ? ' [check warnings]' : '';
    const subject = `New contractor registration: ${event.contractor.company_name}${event.contractor.email_verified ? '' : ' (unverified)'}${warn}`;
    const { data, error } = await resend.emails.send({
        from: getContractorEmailFrom(env),
        to: recipients,
        subject,
        html: renderContractorRegistrationNotification(event, env.CONTRACTOR_APPROVAL_DASHBOARD_URL || DEFAULT_APPROVAL_DASHBOARD_URL),
        replyTo: event.contractor.email,
    });

    if (error) {
        throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
    }

    return {
        skipped: false,
        id: data?.id || null,
        recipients,
        subject,
    };
}