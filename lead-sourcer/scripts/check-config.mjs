import { APIFY_FACEBOOK_TASK_ID, APIFY_NEXTDOOR_TASK_ID } from '../src/config.js';

const flag = (name) => {
    const value = String(process.env[name] || '').trim().toLowerCase();
    if (!value) return true;
    return !['0', 'false', 'no', 'off'].includes(value);
};

const checks = [
    ['LEAD_SOURCER_ENABLE_REDDIT', flag('LEAD_SOURCER_ENABLE_REDDIT'), Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)],
    ['LEAD_SOURCER_ENABLE_CRAIGSLIST', flag('LEAD_SOURCER_ENABLE_CRAIGSLIST'), true],
    ['LEAD_SOURCER_ENABLE_APIFY', flag('LEAD_SOURCER_ENABLE_APIFY'), Boolean(process.env.APIFY_TOKEN)],
    ['delivery:resend', Boolean(process.env.RESEND_API_KEY), true],
    ['delivery:webhook', Boolean(process.env.LEAD_WEBHOOK_URL), true],
    ['apify:nextdoor-task', Boolean(APIFY_NEXTDOOR_TASK_ID), Boolean(process.env.APIFY_TOKEN)],
    ['apify:facebook-task', Boolean(APIFY_FACEBOOK_TASK_ID), Boolean(process.env.APIFY_TOKEN)],
];

let failures = 0;
for (const [name, enabled, configured] of checks) {
    const status = !enabled ? 'disabled' : configured ? 'ready' : 'missing';
    console.log(`[sourcer:check] ${name}: ${status}`);
    if (enabled && !configured) failures += 1;
}

if (failures > 0) {
    console.warn(`[sourcer:check] ${failures} enabled requirement(s) are missing.`);
    process.exitCode = 1;
} else {
    console.log('[sourcer:check] Configuration is ready for the enabled paths.');
}
