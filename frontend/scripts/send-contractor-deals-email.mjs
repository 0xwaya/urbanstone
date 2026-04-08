import { Resend } from 'resend';
import { CONTRACTOR_TIERS } from '../lib/contractor-deals.js';

const APPROVED_RECIPIENTS = [
    'fchomesolutions513@gmail.com',
    'havenlove55@gmail.com',
];

const SITE_URL = 'https://urbanstone.co';

function getRecipients(argv) {
    if (argv.includes('--approved')) {
        if (!argv.includes('--confirm-approved-send')) {
            throw new Error('Approved recipient send blocked. Re-run with --approved --confirm-approved-send only when explicitly requested.');
        }
        return APPROVED_RECIPIENTS;
    }

    const toArg = argv.find((arg) => arg.startsWith('--to='));
    if (toArg) {
        return toArg
            .slice('--to='.length)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }

    return ['sales@urbanstone.co'];
}

function renderTierCards() {
    return CONTRACTOR_TIERS.map((tier) => `
        <div style="border:1px solid #d6c39b;background:#fcf7ed;border-radius:20px;padding:18px 18px 16px;overflow:hidden;">
            <div style="margin:-18px -18px 16px;">
                <img
                    src="${SITE_URL}${tier.image}"
                    alt="${tier.name} quartz slab"
                    width="640"
                    height="420"
                    style="display:block;width:100%;height:auto;max-height:220px;object-fit:cover;background:#efe6d2;"
                />
            </div>
            <div style="font-size:18px;font-weight:700;color:#141414;line-height:1.25;word-break:normal;overflow-wrap:normal;">${tier.name}</div>
            ${tier.badge ? `<div style="display:inline-block;margin-top:10px;border-radius:999px;background:#1f5f4a;color:#ffffff;padding:6px 10px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;">${tier.badge}</div>` : ''}
            <div style="margin-top:10px;font-size:13px;line-height:1.6;color:#5f5a50;word-break:normal;overflow-wrap:normal;">${tier.description}</div>
            <div style="margin-top:14px;font-size:24px;font-weight:700;color:#141414;">${tier.price}${tier.unit}</div>
            <div style="margin-top:8px;font-size:12px;line-height:1.7;color:#6e675b;word-break:normal;overflow-wrap:normal;">${tier.applications}</div>
        </div>
    `).join('');
}

function renderEmailHtml() {
    return `
        <div style="margin:0;background:#0b1020;padding:36px 16px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#f7f3ea;">
            <div style="max-width:680px;margin:0 auto;background:#10182c;border:1px solid #24314d;border-radius:28px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.28);">
                <div style="padding:34px 34px 24px;background:linear-gradient(180deg,#111b31 0%,#0f1729 100%);border-bottom:1px solid #24314d;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#c9b487;">Urban Stone Contractor Program</div>
                    <h1 style="margin:14px 0 12px;font-size:34px;line-height:1.08;color:#f7f3ea;">Installed quartz pricing for multi-unit contractors.</h1>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#c7cfdf;">Shared for apartment developers, hotel builders, and office contractors evaluating quick-turn quartz packages for multi-unit work.</p>
                </div>
                <div style="padding:28px 34px 20px;">
                    <div style="display:grid;gap:14px;">${renderTierCards()}</div>
                    <div style="margin-top:22px;border:1px solid #24314d;background:#0d1424;border-radius:22px;padding:20px;">
                        <div style="font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#c9b487;">Program notes</div>
                        <ul style="padding-left:18px;margin:14px 0 0;color:#c7cfdf;font-size:14px;line-height:1.8;">
                            <li>Installed pricing for qualified contractor and developer work.</li>
                            <li>3CM quartz, fabrication plus installation included.</li>
                            <li>Volume pricing available for 10+ units and phased rollouts.</li>
                        </ul>
                    </div>
                    <div style="margin-top:22px;border-top:1px solid #24314d;padding-top:20px;">
                        <div style="font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#c9b487;">Direct inquiries</div>
                        <p style="margin:12px 0 0;font-size:14px;line-height:1.8;color:#c7cfdf;">Reply to this email or contact <a href="mailto:sales@urbanstone.co" style="color:#f3d28d;text-decoration:none;">sales@urbanstone.co</a> or call (513) 307-5840 with unit count, timeline, and preferred material.</p>
                        <div style="margin-top:18px;">
                            <a href="${SITE_URL}/contractors/login" style="display:inline-block;border-radius:999px;background:#d2b378;color:#141414;text-decoration:none;padding:14px 22px;font-size:14px;font-weight:700;">Open Contractor Portal</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function main() {
    const recipients = getRecipients(process.argv.slice(2));
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTRACTOR_EMAIL_FROM || 'Urban Stone <sales@urbanstone.co>';

    if (!apiKey) {
        throw new Error('RESEND_API_KEY is required');
    }

    if (!recipients.length) {
        throw new Error('No recipients specified');
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
        from,
        to: recipients,
        subject: recipients.length === 1
            ? 'Contractor Program Pricing Preview'
            : 'Urban Stone Contractor Program Pricing',
        html: renderEmailHtml(),
    });

    if (error) {
        throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
    }

    console.log(`Sent contractor deals email to: ${recipients.join(', ')}`);
    console.log(JSON.stringify(data));
}

main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});