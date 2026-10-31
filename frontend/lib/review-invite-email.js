/**
 * Review invitation email. Set REVIEW_GOOGLE_REVIEW_URL (one value) once the
 * Google Business Profile is verified and a Google review line is added
 * automatically; until then the email points only to the on-site form.
 */
export const REVIEW_EMAIL_FROM = 'Edward Mercado <sales@urbanstone.co>';
export const REVIEW_EMAIL_REPLY_TO = 'sales@urbanstone.co';

const SIGNATURE = ['Edward Mercado', 'Urban Stone Collective', '(513) 307-5840', 'sales@urbanstone.co', 'urbanstone.co'];

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function cleanGoogleUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'https:' ? url.toString() : '';
    } catch {
        return '';
    }
}

export function firstNameOf(name) {
    return String(name || '').trim().split(/\s+/)[0] || 'there';
}

export function buildReviewInviteEmail({ customerName, jobLabel, inviteUrl, googleReviewUrl = process.env.REVIEW_GOOGLE_REVIEW_URL }) {
    const firstName = firstNameOf(customerName);
    const job = String(jobLabel || '').trim().toLowerCase() || 'new countertops';
    const google = cleanGoogleUrl(googleReviewUrl);
    const subject = 'How are you enjoying your new countertops?';

    const paragraphs = [
        `Hi ${firstName},`,
        `Thank you again for choosing Urban Stone for your ${job}. It was a pleasure working with you, and I hope you're loving how everything turned out.`,
        'If you have a couple of minutes, I would really appreciate a short review. Leaving a review right on our website is a new feature we just turned on while our Google Business profile is being verified, so you would be one of the very first.',
        `Here is your personal link (it's good for 14 days):\n${inviteUrl}`,
    ];
    if (google) paragraphs.push(`If it's easier, you can also leave one on Google:\n${google}`);
    paragraphs.push('Honest feedback of any kind helps us and the next homeowner. Thank you!');

    const text = `${paragraphs.join('\n\n')}\n\n${SIGNATURE.join('\n')}\n`;

    const linkButton = (href, label) => `<p style="margin:20px 0"><a href="${escapeHtml(href)}" style="background:#1f1a17;color:#ffffff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(label)}</a></p>`;
    const html = [
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f1a17;max-width:560px">',
        `<p>${escapeHtml(paragraphs[0])}</p>`,
        `<p>${escapeHtml(paragraphs[1])}</p>`,
        `<p>${escapeHtml(paragraphs[2])}</p>`,
        linkButton(inviteUrl, 'Write your review'),
        `<p style="font-size:13px;color:#6b625b">This personal link is good for 14 days.</p>`,
        google ? `<p>If it's easier, you can also <a href="${escapeHtml(google)}">leave one on Google</a>.</p>` : '',
        '<p>Honest feedback of any kind helps us and the next homeowner. Thank you!</p>',
        `<p>${SIGNATURE.map((line, index) => (index === 4 ? `<a href="https://urbanstone.co">${line}</a>` : escapeHtml(line))).join('<br>')}</p>`,
        '</div>',
    ].join('');

    return { subject, text, html };
}

/** Sends through Resend's HTTP API. Callers decide whether sending is allowed. */
export async function sendReviewInviteEmail({ to, email, env = process.env, fetchImpl = fetch }) {
    const apiKey = String(env.RESEND_API_KEY || '').trim();
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
    const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: REVIEW_EMAIL_FROM,
            to: [to],
            bcc: [REVIEW_EMAIL_REPLY_TO],
            reply_to: REVIEW_EMAIL_REPLY_TO,
            subject: email.subject,
            text: email.text,
            html: email.html,
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Resend rejected review invite: ${response.status}`);
    return data?.id || null;
}
