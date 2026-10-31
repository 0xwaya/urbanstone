import { REVIEW_EMAIL_FROM, REVIEW_EMAIL_REPLY_TO } from './review-invite-email';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Auto-publish is on unless REVIEWS_AUTO_PUBLISH is explicitly "false"/"0"/"off". */
export function isAutoPublishEnabled(env = process.env) {
    return !['false', '0', 'off', 'no'].includes(String(env.REVIEWS_AUTO_PUBLISH ?? '').trim().toLowerCase());
}

/** Internal heads-up to sales@ only (never the customer). */
export function buildReviewPublishedNotice({ displayName, rating, reviewText, jobLabel, siteUrl = 'https://www.urbanstone.co' }) {
    const stars = '★'.repeat(Number(rating) || 0);
    const subject = `New ${rating}-star review is live: ${displayName}`;
    const lines = [
        `A new invite-verified review was published on urbanstone.co.`,
        '',
        `${stars} ${displayName}${jobLabel ? ` (${jobLabel})` : ''}`,
        `"${reviewText}"`,
        '',
        `It is live now: ${siteUrl}/#reviews`,
        `To take it down, open ${siteUrl}/admin/reviews and click Unpublish.`,
    ];
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f1a17;max-width:560px">`
        + `<p>A new invite-verified review was published on urbanstone.co.</p>`
        + `<p><strong>${escapeHtml(stars)} ${escapeHtml(displayName)}</strong>${jobLabel ? ` (${escapeHtml(jobLabel)})` : ''}<br>&ldquo;${escapeHtml(reviewText)}&rdquo;</p>`
        + `<p><a href="${siteUrl}/#reviews">See it on the homepage</a> &middot; <a href="${siteUrl}/admin/reviews">Unpublish in admin</a></p></div>`;
    return { subject, text: lines.join('\n'), html };
}

export async function notifySalesReviewPublished(review, { env = process.env, fetchImpl = fetch } = {}) {
    const apiKey = String(env.RESEND_API_KEY || '').trim();
    if (!apiKey) return { skipped: 'no-resend-key' };
    const email = buildReviewPublishedNotice(review);
    const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: REVIEW_EMAIL_FROM, to: [REVIEW_EMAIL_REPLY_TO], subject: email.subject, text: email.text, html: email.html }),
    });
    if (!response.ok) throw new Error(`Resend rejected review notice: ${response.status}`);
    return { sent: true };
}
