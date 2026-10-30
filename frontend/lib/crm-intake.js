/**
 * CRM intake (phase two): just before a website lead email is sent, save the
 * contact + intake into the Supabase CRM through the service-role-only RPC
 * public.crm_ingest_intake. Server-only (uses SUPABASE_SERVICE_ROLE_KEY via
 * lib/supabase.js); never import this from client code.
 *
 * Off unless CRM_SYNC_ENABLED=true. Never throws and is capped at a short
 * timeout, so it can never block or fail the Resend email or the response
 * (the email only shows the result as a footer line).
 * Idempotent on (source_channel, dedupeKey).
 */
import { getSupabase } from './supabase';

const DEFAULT_TIMEOUT_MS = 2500;

export function isCrmSyncEnabled(env = process.env) {
    return ['1', 'true', 'yes', 'on'].includes(String(env.CRM_SYNC_ENABLED || '').trim().toLowerCase());
}

function clean(value, max = 2000) {
    const text = String(value ?? '').trim();
    return text ? text.slice(0, max) : null;
}

/** "Mason 45040" -> "Mason" (the ZIP goes in its own column). */
function cityOnly(text) {
    return clean(String(text || '').replace(/,?\s*\b\d{5}(?:-\d{4})?\b/g, ''), 120);
}

function zipFrom(text) {
    return String(text || '').match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] || null;
}

/** Remove fields that must not be stored (drawing image data, IP, user agent). */
function safeRaw(payload, extra = {}) {
    const { drawingImage, ...lead } = payload.lead || {};
    const { ip, userAgent, ...metadata } = payload.metadata || {};
    return { source: payload.source, requestId: payload.requestId, routeId: payload.routeId, submittedAt: payload.submittedAt, hasDrawing: Boolean(drawingImage), lead, metadata, ...extra };
}

export function buildFormIntake(payload) {
    const lead = payload.lead || {};
    return {
        contact: { contact_type: 'unknown', person_name: clean(lead.name, 200), email: clean(lead.email, 200), phone: clean(lead.phone, 40) },
        intake: {
            source_channel: 'website_form',
            sub_source: clean(payload.routeId, 80),
            source_ref: clean(payload.dedupeKey, 120),
            received_at: payload.submittedAt,
            scope: clean([lead.projectDetails, lead.totalSquareFootage ? `${lead.totalSquareFootage} sq ft` : '', lead.currentTopMaterial ? `current top: ${lead.currentTopMaterial}` : '', Array.isArray(lead.materialPreferences) && lead.materialPreferences.length ? `materials: ${lead.materialPreferences.join(', ')}` : '', lead.timeframeGoal ? `timeframe: ${lead.timeframeGoal}` : ''].filter(Boolean).join(' | ')),
            raw: safeRaw(payload),
        },
    };
}

export function buildChatIntake(payload) {
    const lead = payload.lead || {};
    const chat = payload.chatIntake || {};
    const segment = String(chat.customerSegment || '');
    return {
        contact: {
            contact_type: /builder|contractor|flipper/i.test(segment) ? 'contractor' : /homeowner/i.test(segment) ? 'homeowner' : 'unknown',
            person_name: clean(lead.name, 200),
            email: clean(lead.email, 200),
            phone: clean(lead.phone, 40),
            city: cityOnly(chat.city),
            zip: zipFrom(chat.city),
        },
        intake: {
            source_channel: 'website_chat',
            sub_source: clean(payload.routeId, 80),
            source_ref: clean(payload.dedupeKey, 120),
            received_at: payload.submittedAt,
            project_city: cityOnly(chat.city),
            project_zip: zipFrom(chat.city),
            scope: clean(chat.summary) || clean(lead.projectDetails),
            raw: safeRaw({ ...payload, chatIntake: undefined }, { chatIntake: chat }),
        },
    };
}

export function buildContractorEstimateIntake(payload) {
    const est = payload.estimate || {};
    const { ip, userAgent, ...metadata } = payload.metadata || {};
    return {
        contact: { contact_type: 'contractor', company_name: clean(est.companyName, 200), person_name: clean(est.name, 200), email: clean(est.email, 200), phone: clean(est.phone, 40) },
        intake: {
            source_channel: 'contractor_estimate',
            sub_source: clean(payload.routeId, 80),
            source_ref: clean(payload.dedupeKey, 120),
            received_at: payload.submittedAt,
            project_address: clean(est.projectLocation, 300),
            project_zip: zipFrom(est.projectLocation),
            scope: clean([est.projectName, est.propertyType, est.numberOfUnits ? `${est.numberOfUnits} units` : '', est.projectDetails].filter(Boolean).join(' | ')),
            raw: { source: payload.source, requestId: payload.requestId, submittedAt: payload.submittedAt, estimate: est, metadata },
        },
    };
}

/**
 * Save one intake. Resolves to { ok, skipped?, data?, error? }; never rejects.
 * Error text is logged without contact details.
 */
export async function saveCrmIntake(body, { env = process.env, client, timeoutMs = DEFAULT_TIMEOUT_MS, logTag = 'crm_intake' } = {}) {
    if (!isCrmSyncEnabled(env)) return { ok: false, skipped: true };
    let timer;
    try {
        const supabase = client || getSupabase();
        const call = supabase.rpc('crm_ingest_intake', { p: body });
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs); });
        const { data, error } = await Promise.race([call, timeout]);
        if (error) throw new Error(error.message || 'rpc error');
        console.info(`${logTag}_saved`, { channel: body?.intake?.source_channel, createdIntake: Boolean(data?.created_intake), isRepeat: Boolean(data?.is_repeat) });
        return { ok: true, data };
    } catch (error) {
        const message = String(error?.message || error).replace(/[^\s@()=,]+@[^\s@()=,]+/g, '[email]').replace(/[+(]?\d[\d\s().-]{8,}\d/g, '[number]').slice(0, 200);
        console.error(`${logTag}_failed`, { channel: body?.intake?.source_channel, error: message });
        return { ok: false, error: message };
    } finally {
        clearTimeout(timer);
    }
}
