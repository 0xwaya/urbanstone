/**
 * Relay a matched lead payload to the configured webhook endpoint.
 * Uses the same LEAD_WEBHOOK_URL env var as the Next.js API route.
 */
import { toZapReadyPayload } from './core/field-mapping.js';

export async function relay(payload) {
    const webhookUrl = process.env.LEAD_WEBHOOK_URL;
    const zapPayload = toZapReadyPayload(payload);

    if (!webhookUrl) {
        console.warn('[relay] LEAD_WEBHOOK_URL not set — printing payload instead:\n', JSON.stringify(zapPayload, null, 2));
        return;
    }

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zapPayload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Webhook relay failed: ${response.status} ${text}`);
    }

    console.log(`[relay] Sent lead from ${zapPayload.metadata?.routeId} → ${response.status}`);
}
