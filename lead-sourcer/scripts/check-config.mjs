import {
    APIFY_AD_LIBRARY_TASK_ID,
    APIFY_ENABLE_FB_MARKETPLACE,
    APIFY_FACEBOOK_TASK_ID,
    APIFY_FB_MARKETPLACE_CANARY_TASK_ID,
    APIFY_FB_MARKETPLACE_MAX_CHARGE_USD,
    APIFY_FB_MARKETPLACE_REVIEW_ONLY,
    APIFY_FB_MARKETPLACE_TASK_ID,
    APIFY_NEXTDOOR_TASK_ID,
} from '../src/config.js';
import { resolveRunMode } from '../src/mode.js';
import { isPermitsEnabled } from '../src/permits.js';
import { isHamiltonPermitsEnabled, isButlerPermitsEnabled } from '../src/permits-accela.js';

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
    // Reddit falls back to unauthenticated public JSON when API credentials are absent (src/reddit.js).
    ['LEAD_SOURCER_ENABLE_REDDIT', flag('LEAD_SOURCER_ENABLE_REDDIT'), true],
    ['LEAD_SOURCER_ENABLE_CRAIGSLIST', flag('LEAD_SOURCER_ENABLE_CRAIGSLIST'), true],
    // Permits use public city open data (no key); default off. SOCRATA_APP_TOKEN is optional.
    ['LEAD_SOURCER_ENABLE_PERMITS', isPermitsEnabled(), true],
    // County permit portals (Accela Citizen Access, anonymous search; no key); default off.
    ['LEAD_SOURCER_ENABLE_PERMITS_HAMILTON', isHamiltonPermitsEnabled(), true],
    ['LEAD_SOURCER_ENABLE_PERMITS_BUTLER', isButlerPermitsEnabled(), true],
    ['LEAD_SOURCER_ENABLE_APIFY (APIFY_TOKEN)', apifyEnabled, has('APIFY_TOKEN')],
    ['apify task id (nextdoor, facebook, ad-library or fb-marketplace)', apifyEnabled, Boolean(APIFY_NEXTDOOR_TASK_ID || APIFY_FACEBOOK_TASK_ID || APIFY_AD_LIBRARY_TASK_ID || APIFY_FB_MARKETPLACE_TASK_ID)],
    ['APIFY_ENABLE_FB_MARKETPLACE (APIFY_FB_MARKETPLACE_TASK_ID + APIFY_FB_MARKETPLACE_CANARY_TASK_ID)', apifyEnabled && APIFY_ENABLE_FB_MARKETPLACE, Boolean(APIFY_FB_MARKETPLACE_TASK_ID && APIFY_FB_MARKETPLACE_CANARY_TASK_ID)],
    // A spend cap is mandatory for the pay-per-event Marketplace actor.
    ['APIFY_FB_MARKETPLACE_MAX_CHARGE_USD (0 < cap <= 2)', apifyEnabled && APIFY_ENABLE_FB_MARKETPLACE, APIFY_FB_MARKETPLACE_MAX_CHARGE_USD > 0 && APIFY_FB_MARKETPLACE_MAX_CHARGE_USD <= 2],
    // Live mode must have at least one channel; previously a missing key was reported as "disabled" and passed.
    ['delivery channel (RESEND_API_KEY or LEAD_WEBHOOK_URL)', mode === 'live', anyDelivery],
];

console.log(`[sourcer:check] mode=${mode}`);
if (flag('LEAD_SOURCER_ENABLE_REDDIT') && !(has('REDDIT_CLIENT_ID') && has('REDDIT_CLIENT_SECRET'))) {
    console.warn('[sourcer:check] Reddit: REDDIT_CLIENT_ID/SECRET not set; using unauthenticated public access (may be rate-limited or blocked).');
}
let failures = 0;
for (const [name, enabled, configured] of checks) {
    const status = !enabled ? 'disabled' : configured ? 'ready' : 'missing';
    console.log(`[sourcer:check] ${name}: ${status}`);
    if (enabled && !configured) failures += 1;
}
if (isPermitsEnabled()) console.log(`[sourcer:check] permits: SOCRATA_APP_TOKEN ${has('SOCRATA_APP_TOKEN') ? 'set' : 'not set (optional; anonymous rate limits apply)'}`);
if (apifyEnabled && APIFY_ENABLE_FB_MARKETPLACE) {
    console.log(`[sourcer:check] fb-marketplace: cap=$${APIFY_FB_MARKETPLACE_MAX_CHARGE_USD}/run, reviewOnly=${APIFY_FB_MARKETPLACE_REVIEW_ONLY}`);
}
console.log(`[sourcer:check] resend: ${has('RESEND_API_KEY') ? 'set' : 'not set'}, webhook: ${has('LEAD_WEBHOOK_URL') ? 'set' : 'not set'}`);

if (failures > 0) {
    console.warn(`[sourcer:check] ${failures} enabled requirement(s) are missing.`);
    process.exitCode = 1;
} else {
    console.log('[sourcer:check] Configuration is ready for the enabled paths.');
}
