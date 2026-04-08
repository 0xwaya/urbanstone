export const DEFAULT_CONTRACTOR_EMAIL_FROM = 'Urban Stone <no-reply@send.urbanstone.co>';
export const DEFAULT_CONTRACTOR_PORTAL_BASE_URL = 'https://www.urbanstone.co';

function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/$/, '');
}

export function getContractorEmailFrom(env = process.env) {
    return env.CONTRACTOR_EMAIL_FROM || DEFAULT_CONTRACTOR_EMAIL_FROM;
}

export function getContractorPortalBaseUrl(req, env = process.env) {
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const forwardedHost = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').split(',')[0].trim();

    if (forwardedProto && forwardedHost) {
        return normalizeBaseUrl(`${forwardedProto}://${forwardedHost}`);
    }

    const origin = normalizeBaseUrl(req?.headers?.origin);
    if (/^https?:\/\//i.test(origin)) {
        return origin;
    }

    const configured = normalizeBaseUrl(env.NEXT_PUBLIC_SITE_URL);
    if (/^https?:\/\//i.test(configured)) {
        return configured;
    }

    return DEFAULT_CONTRACTOR_PORTAL_BASE_URL;
}

export function renderContractorMagicLinkEmail(magicUrl) {
    return `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;">
        <h2 style="color:#4a90e2;margin-bottom:8px;">Urban Stone</h2>
        <p style="color:#a8afc0;font-size:13px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:24px;">Contractor Portal</p>
        <p>Click the link below to access your contractor pricing. This link expires in 4 hours.</p>
        <a href="${magicUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#4a90e2;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Access Contractor Portal
        </a>
        <p style="color:#a8afc0;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
}
