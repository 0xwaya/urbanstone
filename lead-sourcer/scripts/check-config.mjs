import { RETIRED_SOURCES } from '../src/config.js';
import { resolveRunMode } from '../src/mode.js';
import { isPermitsEnabled } from '../src/permits.js';
import { isHamiltonPermitsEnabled, isButlerPermitsEnabled } from '../src/permits-accela.js';

// Prints names and ready/missing status only; never prints secret values.
const has = (name) => Boolean(String(process.env[name] || '').trim());

const mode = resolveRunMode();
const anyDelivery = has('RESEND_API_KEY');

// [name, enabled, configured]
const checks = [
    // County permit portals (Accela Citizen Access, anonymous search; no key); default off.
    ['LEAD_SOURCER_ENABLE_PERMITS_HAMILTON', isHamiltonPermitsEnabled(), true],
    // Permits use public city open data (no key); default off. SOCRATA_APP_TOKEN is optional.
    ['LEAD_SOURCER_ENABLE_PERMITS', isPermitsEnabled(), true],
    ['LEAD_SOURCER_ENABLE_PERMITS_BUTLER', isButlerPermitsEnabled(), true],
    // Live mode must have at least one channel.
    ['delivery channel (RESEND_API_KEY)', mode === 'live', anyDelivery],
];

console.log(`[sourcer:check] mode=${mode}`);
console.log(`[sourcer:check] retired sources (switches ignored): ${RETIRED_SOURCES.join(', ')}`);
let failures = 0;
for (const [name, enabled, configured] of checks) {
    const status = !enabled ? 'disabled' : configured ? 'ready' : 'missing';
    console.log(`[sourcer:check] ${name}: ${status}`);
    if (enabled && !configured) failures += 1;
}
if (isPermitsEnabled()) console.log(`[sourcer:check] permits: SOCRATA_APP_TOKEN ${has('SOCRATA_APP_TOKEN') ? 'set' : 'not set (optional; anonymous rate limits apply)'}`);
console.log(`[sourcer:check] resend: ${has('RESEND_API_KEY') ? 'set' : 'not set'}, webhook: retired`);

if (failures > 0) {
    console.warn(`[sourcer:check] ${failures} enabled requirement(s) are missing.`);
    process.exitCode = 1;
} else {
    console.log('[sourcer:check] Configuration is ready for the enabled paths.');
}
