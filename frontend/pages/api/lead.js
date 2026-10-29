import {
    buildLeadDedupeKey,
    buildLeadForwardPayload,
    consumeRateLimit,
    getClientIp,
    getLeadApiRuntimeConfig,
    getLeadDedupeStore,
    getRateLimitStore,
    isLeadDuplicate,
    isSameOriginRequest,
    sanitizeLeadPayload,
} from '../../lib/lead';
import { sendWebsiteLeadEmail } from '../../lib/lead-email';

// Website leads are emailed directly to the sales inbox via Resend
// (no Zapier webhook in the path). The dedupe store prevents the same lead
// from being emailed more than once within the deduplication window. Note: this store is in-memory and resets
// on serverless cold starts; it covers the within-session duplicate case.

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '12mb',
        },
    },
};

function getErrorMessage(error) {
    if (error && typeof error.message === 'string') {
        return error.message;
    }

    return 'Unknown delivery error';
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
    const runtimeConfig = getLeadApiRuntimeConfig();
    const rateLimit = consumeRateLimit(
        rateLimitStore,
        ipAddress,
        runtimeConfig.rateLimitMax,
        runtimeConfig.rateLimitWindowMs,
    );

    response.setHeader('X-RateLimit-Limit', String(runtimeConfig.rateLimitMax));
    response.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));

    if (rateLimit.limited) {
        response.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
        console.warn('lead_rate_limit_exceeded', {
            ipAddress,
            count: rateLimit.count,
            limit: runtimeConfig.rateLimitMax,
            windowMs: runtimeConfig.rateLimitWindowMs,
            retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
        return response.status(429).json({ message: 'Too many lead submissions from this address. Try again shortly.' });
    }

    const result = sanitizeLeadPayload(request.body);
    if (!result.ok) {
        return response.status(400).json({
            message: 'Please correct the highlighted fields and try again.',
            errors: result.errors,
        });
    }

    if (!String(process.env.RESEND_API_KEY || '').trim()) {
        return response.status(503).json({
            message: 'Lead delivery is not configured. Set RESEND_API_KEY before production deployment.',
        });
    }

    const dedupeKey = buildLeadDedupeKey(result.data);
    const dedupeStore = getLeadDedupeStore();

    if (isLeadDuplicate(dedupeStore, dedupeKey, runtimeConfig.leadDedupeWindowMs)) {
        console.info('lead_duplicate_suppressed', { dedupeKey });
        return response.status(202).json({ message: 'Thanks. Your request is in the queue and we will follow up shortly.' });
    }

    const payload = buildLeadForwardPayload(result.data, request);

    try {
        const delivery = await sendWebsiteLeadEmail(payload);
        console.info('lead_email_sent', {
            requestId: payload.metadata.requestId,
            routeId: payload.metadata.routeId,
            emailId: delivery.id,
        });
        return response.status(202).json({
            message: 'Thanks. Your request is in the queue and we will follow up shortly.',
            id: delivery.id,
        });
    } catch (error) {
        // Release the dedupe key so the visitor can retry after a failed send.
        dedupeStore.delete(dedupeKey);
        console.error('lead_email_failed', {
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