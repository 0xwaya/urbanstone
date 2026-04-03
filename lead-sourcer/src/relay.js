/**
 * Relay a matched lead payload to the configured webhook endpoint.
 * Uses the same LEAD_WEBHOOK_URL env var as the Next.js API route.
 */
export async function relay(payload) {
    const webhookUrl = process.env.LEAD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('[relay] LEAD_WEBHOOK_URL not set — printing payload instead:\n', JSON.stringify(payload, null, 2));
        return;
    }

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Webhook relay failed: ${response.status} ${text}`);
    }

    console.log(`[relay] Sent lead from ${payload.metadata?.routeId} → ${response.status}`);
}
