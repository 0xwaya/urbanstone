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
import { buildContractorEstimateEmail, sendLeadEmail } from '../../lib/lead-email';
import { buildContractorEstimateIntake, saveCrmIntake } from '../../lib/crm-intake';

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

    if (!String(process.env.RESEND_API_KEY || '').trim()) {
        return response.status(503).json({
            message: 'Contractor estimate delivery is not configured. Set RESEND_API_KEY before production deployment.',
        });
    }

    const payload = buildContractorEstimateForwardPayload(result.data, request);
    const dedupeStore = getLeadDedupeStore();
    const dedupeKey = `contractor:${payload.dedupeKey}`;

    if (isLeadDuplicate(dedupeStore, dedupeKey, runtimeConfig.leadDedupeWindowMs)) {
        return response.status(202).json({ message: 'Thanks. Your commercial estimate request is already in the queue and we will follow up shortly.' });
    }

    // CRM save first (flag-gated, capped, never throws) so the email can show the intake id.
    const crm = await saveCrmIntake(buildContractorEstimateIntake(payload));

    try {
        const delivery = await sendLeadEmail(buildContractorEstimateEmail(payload, process.env, crm), {
            idempotencyKey: `contractor-estimate-${payload.dedupeKey}-${payload.requestId}`,
        });
        console.info('contractor_estimate_email_sent', {
            requestId: payload.metadata.requestId,
            routeId: payload.metadata.routeId,
            emailId: delivery.id,
            crmSaved: Boolean(crm?.ok),
        });
        return response.status(202).json({ message: 'Commercial estimate request received. Urban Stone will review the rollout details and follow up shortly.' });
    } catch (error) {
        // Release the dedupe key so the contractor can retry after a failed send.
        dedupeStore.delete(dedupeKey);
        console.error('contractor_estimate_email_failed', {
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