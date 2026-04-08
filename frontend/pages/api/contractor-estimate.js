import {
    consumeRateLimit,
    getClientIp,
    getLeadDedupeStore,
    getLeadApiRuntimeConfig,
    getRateLimitStore,
    isLeadDuplicate,
    isSameOriginRequest,
} from '../../lib/lead';
import {
    buildContractorEstimateForwardPayload,
    sanitizeContractorEstimatePayload,
} from '../../lib/contractor-estimate';

function resolveWebhookUrl(request) {
    if (process.env.CONTRACTOR_ESTIMATE_WEBHOOK_URL) {
        return process.env.CONTRACTOR_ESTIMATE_WEBHOOK_URL;
    }

    if (process.env.LEAD_WEBHOOK_URL) {
        return process.env.LEAD_WEBHOOK_URL;
    }

    if (process.env.NODE_ENV === 'production') {
        return '';
    }

    const host = request.headers['x-forwarded-host'] || request.headers.host;
    const proto = request.headers['x-forwarded-proto'] || 'http';

    if (host) {
        return `${proto}://${host}/api/lead-dev-webhook`;
    }

    return 'http://127.0.0.1:3001/api/lead-dev-webhook';
}

async function relayEstimate(webhookUrl, payload) {
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
        throw new Error(`Contractor estimate relay failed with status ${response.status}`);
    }
}

function getErrorMessage(error) {
    if (error && typeof error.message === 'string') {
        return error.message;
    }

    return 'Unknown relay error';
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ message: 'Method not allowed.' });
    }

    if (!isSameOriginRequest(request)) {
        return response.status(403).json({ message: 'Origin check failed.' });
    }

    const contentType = request.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
        return response.status(415).json({ message: 'Use application/json for contractor estimate submissions.' });
    }

    const runtimeConfig = getLeadApiRuntimeConfig();
    const rateLimitStore = getRateLimitStore();
    const ipAddress = getClientIp(request);
    const rateLimit = consumeRateLimit(
        rateLimitStore,
        `contractor-estimate:${ipAddress}`,
        runtimeConfig.rateLimitMax,
        runtimeConfig.rateLimitWindowMs,
    );

    response.setHeader('X-RateLimit-Limit', String(runtimeConfig.rateLimitMax));
    response.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));

    if (rateLimit.limited) {
        response.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
        return response.status(429).json({ message: 'Too many contractor estimate submissions from this address. Try again shortly.' });
    }

    const result = sanitizeContractorEstimatePayload(request.body);
    if (!result.ok) {
        return response.status(400).json({
            message: 'Please correct the highlighted contractor estimate fields and try again.',
            errors: result.errors,
        });
    }

    const payload = buildContractorEstimateForwardPayload(result.data, request);
    const dedupeStore = getLeadDedupeStore();

    if (isLeadDuplicate(dedupeStore, `contractor:${payload.dedupeKey}`, runtimeConfig.leadDedupeWindowMs)) {
        return response.status(202).json({ message: 'Thanks. Your commercial estimate request is already in the queue and we will follow up shortly.' });
    }

    const webhookUrl = resolveWebhookUrl(request);
    if (!webhookUrl) {
        return response.status(503).json({
            message: 'Contractor estimate delivery is not configured. Set CONTRACTOR_ESTIMATE_WEBHOOK_URL or LEAD_WEBHOOK_URL before production deployment.',
        });
    }

    try {
        await relayEstimate(webhookUrl, payload);
        return response.status(202).json({ message: 'Commercial estimate request received. Urban Stone will review the rollout details and follow up shortly.' });
    } catch (error) {
        console.error('contractor_estimate_relay_failed', {
            requestId: payload.metadata.requestId,
            dedupeKey: payload.metadata.dedupeKey,
            routeId: payload.metadata.routeId,
            source: payload.source,
            error: getErrorMessage(error),
        });

        return response.status(502).json({
            message: 'Contractor estimate delivery is temporarily unavailable. Please email sales@urbanstone.co while we restore it.',
        });
    }
}