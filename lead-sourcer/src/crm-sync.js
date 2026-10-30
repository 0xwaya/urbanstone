/**
 * CRM sync (phase two): after the lead emails have gone out, save each live
 * lead into the Supabase CRM (crm.contacts + crm.intakes) through the
 * service-role-only RPC public.crm_ingest_intake. Idempotent on
 * (source_channel, permit number), so reruns never duplicate an intake.
 *
 * Off unless CRM_SYNC_ENABLED=true. Uses SUPABASE_PROJECT_URL and
 * SUPABASE_SERVICE_ROLE_KEY (never logged). Every failure is caught and
 * returned as a result row for the run report; it can never block or delay
 * a lead email because it only runs after all lead emails were sent.
 */

const SUB_SOURCES = {
    permits: 'permit_cincinnati',
    'permits-hamilton': 'permit_hamilton',
    'permits-butler': 'permit_butler',
};

export function isCrmSyncEnabled(env = process.env) {
    return ['1', 'true', 'yes', 'on'].includes(String(env.CRM_SYNC_ENABLED || '').trim().toLowerCase());
}

function clean(value) {
    const text = String(value ?? '').trim();
    return text || null;
}

function realEmail(value) {
    const email = clean(value)?.toLowerCase() || null;
    if (!email || /^auto\+.*@urbanstone\.co$/.test(email) || !email.includes('@')) return null;
    return email;
}

function realPhone(value) {
    const phone = clean(value);
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || /^1?000000/.test(digits)) return null;
    return phone;
}

/** Strip anything that looks like an email or phone from an error message. */
export function scrubError(error) {
    return String(error?.message || error)
        .replace(/[^\s@()=,]+@[^\s@()=,]+/g, '[email]')
        .replace(/[+(]?\d[\d\s().-]{8,}\d/g, '[number]')
        .slice(0, 200);
}

/** Map one lead-sourcer payload to the RPC body. Exported for tests. */
export function buildCrmIntake(payload, sourceKey, { runId = null } = {}) {
    const meta = payload?.metadata || {};
    const permit = meta.permit || {};
    const address = clean(permit.address);
    const zip = (address && address.match(/\b(\d{5})(?:-\d{4})?\s*$/)?.[1])
        || String(meta.city || '').match(/\b(\d{5})\b/)?.[1] || null;
    const city = clean(String(meta.city || '').replace(/\s*\d{5}.*$/, ''));
    const valuation = Number(meta.estimatedCost);

    return {
        contact: {
            contact_type: 'contractor',
            company_name: clean(payload?.lead?.name),
            email: realEmail(payload?.lead?.email),
            phone: realPhone(payload?.lead?.phone),
        },
        intake: {
            source_channel: 'lead_sourcer',
            sub_source: SUB_SOURCES[sourceKey] || clean(sourceKey),
            source_ref: clean(meta.permitNumber) || clean(payload?.dedupeKey),
            source_run: runId,
            received_at: new Date().toISOString(),
            project_address: address,
            project_city: city,
            project_state: /,\s*KY\b/.test(address || '') ? 'KY' : 'OH',
            project_zip: zip,
            scope: clean(permit.description) || clean(meta.workSummary),
            valuation: Number.isFinite(valuation) && valuation > 0 ? valuation : null,
            raw: {
                permitNumber: clean(meta.permitNumber),
                jurisdiction: clean(permit.jurisdiction || meta.jurisdiction),
                recordType: clean(permit.recordType),
                permitDate: clean(permit.date),
                permitStatus: clean(permit.status),
                contractorType: clean(permit.contractorType),
                contactRole: clean(permit.contactRole),
                score: Number.isFinite(payload?.score) ? payload.score : null,
                scoreBand: clean(payload?.scoreBand),
                sourceUrl: clean(payload?.lead?.externalPostUrl),
                dedupeKey: clean(payload?.dedupeKey),
                routeId: clean(meta.routeId),
            },
        },
    };
}

export async function callCrmIngest(body, { env = process.env, fetchFn = fetch, timeoutMs = 8000 } = {}) {
    const baseUrl = String(env.SUPABASE_PROJECT_URL || env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!baseUrl || !key) throw new Error('missing SUPABASE_PROJECT_URL or SUPABASE_SERVICE_ROLE_KEY');
    const response = await fetchFn(`${baseUrl}/rest/v1/rpc/crm_ingest_intake`, {
        method: 'POST',
        headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ p: body }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 200);
        throw new Error(`CRM RPC ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    return response.json();
}

/** Keep the free Supabase project awake; result is informational only. */
export async function pingCrm({ env = process.env, fetchFn = fetch, timeoutMs = 5000 } = {}) {
    const baseUrl = String(env.SUPABASE_PROJECT_URL || env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!baseUrl || !key) return { ok: false, error: 'missing Supabase env' };
    try {
        const response = await fetchFn(`${baseUrl}/rest/v1/rpc/crm_keepalive`, {
            method: 'POST',
            headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
            body: '{}',
            signal: AbortSignal.timeout(timeoutMs),
        });
        return { ok: response.ok, ...(response.ok ? {} : { error: `HTTP ${response.status}` }) };
    } catch (error) {
        return { ok: false, error: scrubError(error) };
    }
}

/**
 * Sync delivered leads. `entries` = [{ payload, sourceKey }]. Returns a
 * contact-free summary for the run report (no email/phone).
 */
export async function syncLeadsToCrm(entries, { env = process.env, fetchFn = fetch, runId = null, ingestFn = callCrmIngest } = {}) {
    const result = { enabled: isCrmSyncEnabled(env), attempted: 0, created: 0, existing: 0, failed: 0, repeats: [], errors: [], keepalive: null };
    if (!result.enabled) return result;

    for (const { payload, sourceKey } of entries) {
        const body = buildCrmIntake(payload, sourceKey, { runId });
        const label = body.contact.company_name || 'Unknown';
        const ref = body.intake.source_ref || '';
        result.attempted += 1;
        try {
            const out = await ingestFn(body, { env, fetchFn });
            if (out?.created_intake) result.created += 1; else result.existing += 1;
            if (out?.is_repeat) {
                result.repeats.push({
                    company: label,
                    permitNumber: ref,
                    priorIntakes: Number(out.prior_intakes) || 0,
                    priorEmails: Number(out.prior_outbound_emails) || 0,
                });
            }
        } catch (error) {
            result.failed += 1;
            result.errors.push(`${label}${ref ? ` (${ref})` : ''}: ${scrubError(error)}`);
            console.warn(`[crm] sync failed for ${ref || label}: ${scrubError(error)}`);
        }
    }
    if (result.attempted === 0) result.keepalive = await pingCrm({ env, fetchFn });
    console.log(`[crm] attempted=${result.attempted} created=${result.created} existing=${result.existing} failed=${result.failed} repeats=${result.repeats.length}`);
    return result;
}
