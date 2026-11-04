/**
 * Kenton County, KY permit poller (B2B prospects).
 *
 * pdskc.govbuilt.com sits behind Cloudflare, so this reads PDS of Kenton
 * County's public ArcGIS "Development Tracker" layer instead
 * (DevTracking_Permits_KC_Processing, LINK-GIS / services2.arcgis.com). That
 * layer tracks NEW-CONSTRUCTION permits only (residential, multi-family,
 * senior living, commercial...). It has no work description, no valuation and
 * no contractor-of-record; the DEVELOPER column is sometimes filled. Kitchen /
 * bath remodel permits are not in it, so every lead here is a new build.
 *
 * Internal only: delivery goes through relay.js to sales@. Nothing contacts
 * the builder. Off by default (LEAD_SOURCER_ENABLE_PERMITS_KENTON).
 * Network/data failures degrade the source and warn; they never throw.
 */
import { pathToFileURL } from 'node:url';
import { buildAutomatedLeadPayload } from './core/payload.js';
import { isSeen as defaultIsSeen, markSeen as defaultMarkSeen } from './dedup.js';
import { deliverLead, relay as defaultRelay } from './relay.js';
import { resolveRunMode, runModeFlags } from './mode.js';
import { logReviewCandidate } from './review-log.js';
import { scorePermit } from './permits.js';

export const KENTON_LAYER_URL = 'https://services2.arcgis.com/90vxQoG8CT8O1MXs/arcgis/rest/services/DevTracking_Permits_KC_Processing/FeatureServer/0';
export const KENTON_PAGE_URL = 'https://www.arcgis.com/home/item.html?id=1d0e9212bc7745e597bfa360894b21cf';
// Types where a countertop fabricator has work. Commercial/Industrial/Institutional are skipped by default.
export const DEFAULT_KENTON_TYPES = ['residential', 'multi family', 'senior living'];
// PDS refreshes this layer in batches (weeks apart), so look back further than the other
// sources; dedup keeps repeats out. Only LEAD_SOURCER_KENTON_LOOKBACK_DAYS overrides it.
const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_TIMEOUT_MS = 30000;
const OUT_FIELDS = 'FID,SUBDIVISIO,PERMIT_TYP,PERMIT_DAT,PERMIT_SOU,COMMENT,PIDN,ADDRESS,MUNICIPALI,COUNTY,DEVELOPER,PROJECT_ST,BEDROOM_CO';

function envFlag(value, defaultValue) {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return defaultValue;
    return !['0', 'false', 'no', 'off'].includes(raw);
}

/** Opt-in: disabled unless LEAD_SOURCER_ENABLE_PERMITS_KENTON is truthy. */
export function isKentonPermitsEnabled(env = process.env) {
    return envFlag(env.LEAD_SOURCER_ENABLE_PERMITS_KENTON, false);
}

export function getKentonConfig(env = process.env) {
    const lookback = Number(env.LEAD_SOURCER_KENTON_LOOKBACK_DAYS || DEFAULT_LOOKBACK_DAYS);
    const types = String(env.LEAD_SOURCER_KENTON_TYPES || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    return {
        lookbackDays: Number.isFinite(lookback) && lookback > 0 ? Math.min(lookback, 365) : DEFAULT_LOOKBACK_DAYS,
        types: types.length ? types : DEFAULT_KENTON_TYPES,
        timeoutMs: Number(env.LEAD_SOURCER_PERMITS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    };
}

export function buildKentonQueryUrl({ lookbackDays, now = new Date(), resultOffset = 0 }) {
    const since = new Date(now.getTime() - lookbackDays * 86400000).toISOString().slice(0, 10);
    const params = new URLSearchParams({
        where: `PERMIT_DAT >= DATE '${since}'`,
        outFields: OUT_FIELDS,
        orderByFields: 'PERMIT_DAT DESC,FID ASC',
        returnGeometry: 'false',
        resultRecordCount: '1000',
        f: 'json',
    });
    if (resultOffset > 0) params.set('resultOffset', String(resultOffset));
    return `${KENTON_LAYER_URL}/query?${params.toString()}`;
}

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** ArcGIS feature -> normalized permit. The permit number lives in COMMENT. */
export function normalizeKentonFeature(feature) {
    const a = feature?.attributes || {};
    const permitNumber = clean(a.COMMENT) || (a.FID != null ? `FID${a.FID}` : '');
    const issuedAt = Number.isFinite(a.PERMIT_DAT) ? new Date(a.PERMIT_DAT).toISOString().slice(0, 10) : '';
    const type = clean(a.PERMIT_TYP);
    const subdivision = clean(a.SUBDIVISIO);
    const bedrooms = Number(a.BEDROOM_CO) || 0;
    const multi = /multi|senior/i.test(type);
    const description = [
        multi ? `New ${type.toLowerCase()} building` : /^residential$/i.test(type) ? 'New single family home' : `New ${type.toLowerCase()} project`,
        bedrooms ? `${bedrooms} bedroom` : '',
        subdivision && !/single-site/i.test(subdivision) ? `in ${subdivision}` : '',
    ].filter(Boolean).join(', ');
    return {
        permitNumber,
        type,
        subdivision,
        issuedAt,
        address: clean(a.ADDRESS),
        municipality: clean(a.MUNICIPALI) || 'Kenton County',
        parcel: clean(a.PIDN),
        developer: clean(a.DEVELOPER),
        projectStatus: clean(a.PROJECT_ST),
        bedrooms,
        dwellingUnits: multi ? 2 : 1,
        description,
        cost: 0,
    };
}

export function evaluateKentonPermit(permit, config) {
    if (!permit.permitNumber) return { include: false, reason: 'no-permit-number' };
    if (!permit.address) return { include: false, reason: 'no-address' };
    if (!config.types.includes(permit.type.toLowerCase())) return { include: false, reason: 'excluded-type' };
    return { include: true, reason: 'match' };
}

export function buildKentonLead(permit, scoreResult = null) {
    const id = `kenton:${permit.permitNumber}`;
    const score = scoreResult || scorePermit({ ...permit, jurisdiction: 'Kenton County, KY' });
    const builder = permit.developer || 'Builder not listed';
    const where = `${permit.address}, ${permit.municipality}, KY`;
    const body = [
        'B2B prospect: new-construction permit from PDS of Kenton County (Development Tracker). Internal only; do not auto-contact.',
        `Builder/developer: ${builder}`,
        `Work: ${permit.description}`,
        `Job address: ${where}`,
        `Parcel: ${permit.parcel || 'unknown'}`,
        'Estimated cost: not stated (layer has no valuation)',
        `Permit date: ${permit.issuedAt || 'unknown'}`,
        `Permit: ${permit.permitNumber}`,
    ].join('\n');
    const payload = buildAutomatedLeadPayload({
        id,
        source: 'permits-kenton',
        title: `${builder}: ${permit.type || 'Residential'} new build at ${where}`,
        body,
        url: KENTON_PAGE_URL,
        author: permit.developer || '',
        createdAt: permit.issuedAt ? `${permit.issuedAt}T00:00:00.000Z` : new Date().toISOString(),
        verdict: 'b2b',
        scoreResult: score,
    });
    payload.lead.email = '';
    payload.lead.phone = '';
    payload.metadata.internalOnly = true;
    payload.metadata.permitNumber = permit.permitNumber;
    payload.metadata.scoreReasons = score.reasons;
    payload.metadata.reviewNote = score.reviewNote || '';
    payload.metadata.city = permit.municipality;
    payload.metadata.estimatedCost = null;
    payload.metadata.workSummary = permit.description.slice(0, 120);
    payload.metadata.permit = {
        jurisdiction: 'Kenton County, KY',
        address: where,
        recordType: permit.type,
        description: permit.description,
        contractorType: permit.developer ? 'Developer' : '',
        contactRole: '',
        date: permit.issuedAt,
        status: permit.projectStatus || 'Issued',
    };
    return payload;
}

export async function pollKentonPermits({
    mode = 'review-only',
    env = process.env,
    fetchImpl = fetch,
    now = new Date(),
    isSeen = defaultIsSeen,
    markSeen = defaultMarkSeen,
    relayFn = defaultRelay,
    logReview = logReviewCandidate,
} = {}) {
    const modeFlags = runModeFlags(mode);
    const config = getKentonConfig(env);
    const stats = { status: 'ok', fetched: 0, evaluated: 0, matches: 0, rejects: 0, skippedSeen: 0, relayed: 0, rejectReasons: {} };
    const matches = [];

    let permits;
    try {
        const features = [];
        const objectIds = new Set();
        let resultOffset = 0;
        let pageCount = 0;
        while (true) {
            if (pageCount >= 1000) throw new Error('ArcGIS pagination exceeded 1000 pages');
            const response = await fetchImpl(buildKentonQueryUrl({ ...config, now, resultOffset }), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(config.timeoutMs) });
            if (!response.ok) throw new Error(`ArcGIS HTTP ${response.status}`);
            const data = await response.json();
            if (data?.error) throw new Error(`ArcGIS error ${data.error.code || ''} ${data.error.message || ''}`.trim());
            if (!Array.isArray(data?.features)) throw new Error('ArcGIS response has no features array');
            if (data.exceededTransferLimit && data.features.length === 0) throw new Error('ArcGIS pagination returned no features before completion');
            for (const feature of data.features) {
                const objectId = feature?.attributes?.FID;
                if (objectId != null) {
                    if (objectIds.has(String(objectId))) throw new Error('ArcGIS pagination returned duplicate FIDs before completion');
                    objectIds.add(String(objectId));
                }
                features.push(feature);
            }
            if (!data.exceededTransferLimit) break;
            resultOffset += data.features.length;
            pageCount += 1;
        }
        permits = features.map(normalizeKentonFeature);
        stats.fetched = permits.length;
    } catch (error) {
        stats.status = 'degraded';
        stats.error = String(error?.message || error);
        console.warn(`[permits-kenton] Kenton permit layer unavailable; skipping this run: ${stats.error}`);
        return { matches, stats };
    }

    for (const permit of permits) {
        const id = `kenton:${permit.permitNumber}`;
        if (isSeen(id)) { stats.skippedSeen += 1; continue; }
        stats.evaluated += 1;
        const verdict = evaluateKentonPermit(permit, config);
        if (!verdict.include) {
            stats.rejects += 1;
            stats.rejectReasons[verdict.reason] = (stats.rejectReasons[verdict.reason] || 0) + 1;
            continue;
        }
        const scoreResult = scorePermit({ ...permit, jurisdiction: 'Kenton County, KY' }, now);
        const payload = buildKentonLead(permit, scoreResult);
        stats.matches += 1;
        if (!modeFlags.shouldRelay) {
            logReview({
                mode,
                source: 'permits-kenton',
                post: { id, title: `${permit.developer || 'Builder'}: ${permit.description}`.slice(0, 300), url: KENTON_PAGE_URL, createdAt: permit.issuedAt },
                classification: { score: scoreResult.score, band: scoreResult.band, hasPhone: false, hasEmail: false },
                reason: mode === 'dry-run' ? 'dry-run-match' : 'review-only-match',
            });
            if (modeFlags.shouldPersistSeen) markSeen(id);
            matches.push(payload);
            continue;
        }
        if (!(await deliverLead(payload, { postId: id, markSeen, stats, relayFn }))) continue;
        stats.relayed += 1;
        matches.push(payload);
    }

    console.log(`[permits-kenton] fetched=${stats.fetched} evaluated=${stats.evaluated} matches=${stats.matches} rejects=${stats.rejects} seen=${stats.skippedSeen}`);
    return { matches, stats };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    pollKentonPermits({ mode: resolveRunMode() }).catch((error) => {
        console.error('[permits-kenton] Fatal error:', error);
        process.exitCode = 1;
    });
}
