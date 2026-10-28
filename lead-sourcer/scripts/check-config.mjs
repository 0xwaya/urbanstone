import { APIFY_AD_LIBRARY_TASK_ID, APIFY_FACEBOOK_TASK_ID, APIFY_NEXTDOOR_TASK_ID } from '../src/config.js';
import { resolveRunMode } from '../src/mode.js';

// Prints names and ready/missing status only; never prints secret values.
const flag = (name) => {
    const value = String(process.env[name] || '').trim().toLowerCase();
    if (!value) return true;
    return !['0', 'false', 'no', 'off'].includes(value);
};
const has = (name) => Boolean(String(process.env[name] || '').trim());

const mode = resolveRunMode();
const apifyEnabled = flag('LEAD_SOURCER_ENABLE_APIFY');
const anyDelivery = has('RESEND_API_KEY') || has('LEAD_WEBHOOK_URL');

// [name, enabled, configured]
const checks = [
    ['LEAD_SOURCER_ENABLE_REDDIT (REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET)', flag('LEAD_SOURCER_ENABLE_REDDIT'), has('REDDIT_CLIENT_ID') && has('REDDIT_CLIENT_SECRET')],
    ['LEAD_SOURCER_ENABLE_CRAIGSLIST', flag('LEAD_SOURCER_ENABLE_CRAIGSLIST'), true],
    ['LEAD_SOURCER_ENABLE_APIFY (APIFY_TOKEN)', apifyEnabled, has('APIFY_TOKEN')],
    ['apify task id (nextdoor, facebook or ad-library)', apifyEnabled, Boolean(APIFY_NEXTDOOR_TASK_ID || APIFY_FACEBOOK_TASK_ID || APIFY_AD_LIBRARY_TASK_ID)],
    // Live mode must have at least one channel; previously a missing key was reported as "disabled" and passed.
    ['delivery channel (RESEND_API_KEY or LEAD_WEBHOOK_URL)', mode === 'live', anyDelivery],
];

console.log(`[sourcer:check] mode=${mode}`);
let failures = 0;
for (const [name, enabled, configured] of checks) {
    const status = !enabled ? 'disabled' : configured ? 'ready' : 'missing';
    console.log(`[sourcer:check] ${name}: ${status}`);
    if (enabled && !configured) failures += 1;
}
console.log(`[sourcer:check] resend: ${has('RESEND_API_KEY') ? 'set' : 'not set'}, webhook: ${has('LEAD_WEBHOOK_URL') ? 'set' : 'not set'}`);

if (failures > 0) {
    console.warn(`[sourcer:check] ${failures} enabled requirement(s) are missing.`);
    process.exitCode = 1;
} else {
    console.log('[sourcer:check] Configuration is ready for the enabled paths.');
}
