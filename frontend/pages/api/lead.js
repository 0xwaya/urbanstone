import {
    buildLeadForwardPayload,
    getClientIp,
    getRateLimitStore,
    isRateLimited,
    isSameOriginRequest,
    sanitizeLeadPayload,
} from '../../lib/lead';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '12mb',
        },
    },
};

async function relayLead(payload) {
    const response = await fetch(payload.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload.body),
        signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
        throw new Error(`Lead relay failed with status ${response.status}`);
    }
}

function getErrorMessage(error) {
    if (error && typeof error.message === 'string') {
        return error.message;
    }

    return 'Unknown relay error';
}

function resolveWebhookUrl(request) {
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
        return response.status(415).json({ message: 'Use application/json for lead submissions.' });
    }

    const rateLimitStore = getRateLimitStore();
    const ipAddress = getClientIp(request);

    if (isRateLimited(rateLimitStore, ipAddress, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
        return response.status(429).json({ message: 'Too many lead submissions from this address. Try again shortly.' });
    }

    const result = sanitizeLeadPayload(request.body);
    if (!result.ok) {
        return response.status(400).json({
            message: 'Please correct the highlighted fields and try again.',
            errors: result.errors,
        });
    }

    const webhookUrl = resolveWebhookUrl(request);

    if (!webhookUrl) {
        return response.status(503).json({
            message: 'Lead delivery is not configured. Set LEAD_WEBHOOK_URL before production deployment.',
        });
    }

    const payload = buildLeadForwardPayload(result.data, request);

    try {
        await relayLead({
            webhookUrl,
            body: payload,
        });
        return response.status(202).json({ message: 'Thanks. Your request is in the queue and we will follow up shortly.' });
    } catch (error) {
        console.error('lead_relay_failed', {
            requestId: payload.metadata.requestId,
            dedupeKey: payload.metadata.dedupeKey,
            routeId: payload.metadata.routeId,
            source: payload.source,
            error: getErrorMessage(error),
        });

        return response.status(502).json({
            message: 'Lead delivery is temporarily unavailable. Please call or email us directly while we restore it.',
        });
    }
}