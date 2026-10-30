/**
 * County building-permit pollers on Accela Citizen Access (B2B prospects).
 *
 *  - hamilton-county: Hamilton County ezTrak (eztrak.cagis.org/CitizenAccess).
 *    The results grid has no description, so we filter by record type first
 *    and read the detail page of candidates only. City of Cincinnati records
 *    in ezTrak are skipped (the Socrata "permits" source covers the city).
 *  - butler-county: Butler County ACA (aca-prod.accela.com/BUTLER). The grid
 *    carries a description, so the keyword filter runs before any detail fetch.
 *
 * Same contract as permits.js: keyword/exclusion lists (LEAD_SOURCER_PERMITS_*),
 * scoring, registry enrichment, internal-only leads to sales@ through relay.js
 * (never the contractor), degraded status instead of throwing. Each county is
 * off by default (LEAD_SOURCER_ENABLE_PERMITS_HAMILTON / _BUTLER).
 */
import { pathToFileURL } from 'node:url';
import { buildAutomatedLeadPayload } from './core/payload.js';
import { isSeen as defaultIsSeen, markSeen as defaultMarkSeen } from './dedup.js';
import { deliverLead, relay as defaultRelay } from './relay.js';
import { resolveRunMode, runModeFlags } from './mode.js';
import { logReviewCandidate } from './review-log.js';
import { loadContractorRegistry, lookupContractor } from './contractor-registry.js';
import { getPermitsConfig, evaluatePermit, scorePermit } from './permits.js';
import { createAccelaClient, formatAcaDate, pickContractor } from './accela.js';

export const DEFAULT_TYPE_KEYWORDS = ['alteration', 'addition', 'remodel', 'renovat', 'repair', 'tenant finish', 'interior'];
export const DEFAULT_TYPE_EXCLUDE_KEYWORDS = ['special inspection', 'revision', 'mechanical', 'hvac', 're-roof', 'roof', 'sign', 'demolition', 'fence', 'pool', 'deck', 'electrical', 'plumbing', 'sewer', 'fire'];
const INACTIVE_STATUS_RE = /\b(void|withdrawn?|expired|denied|cancel+ed|revoked|abandoned)\b/i;

export const COUNTY_SOURCES = {
    'hamilton-county': {
        source: 'permits-hamilton',
        label: 'Hamilton County (ezTrak)',
        envFlag: 'LEAD_SOURCER_ENABLE_PERMITS_HAMILTON',
        baseUrl: 'https://eztrak.cagis.org/CitizenAccess',
        idPrefix: 'eztrak',
        jurisdiction: 'Hamilton County, OH',
        hasListDescription: false,
        // City of Cincinnati records also live in ezTrak; the Socrata source covers them.
        skipRecord: (row) => /^CIN-/i.test(row.recordNumber) || /agencyCode=CINCINNATI\b/i.test(row.detailUrl),
    },
    'butler-county': {
        source: 'permits-butler',
        label: 'Butler County (Accela)',
        envFlag: 'LEAD_SOURCER_ENABLE_PERMITS_BUTLER',
        baseUrl: 'https://aca-prod.accela.com/BUTLER',
        idPrefix: 'butler',
        jurisdiction: 'Butler County, OH',
        hasListDescription: true,
        skipRecord: () => false,
    },
};

function envFlag(value, defaultValue) {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return defaultValue;
    return !['0', 'false', 'no', 'off'].includes(raw);
}

function parseList(value, fallback) {
    const list = String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    return list.length > 0 ? list : fallback;
}

function positive(value, fallback, max) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.min(number, max) : fallback;
}

export function isCountyPermitsEnabled(countyKey, env = process.env) {
    const county = COUNTY_SOURCES[countyKey];
    return Boolean(county) && envFlag(env[county.envFlag], false);
}

export const isHamiltonPermitsEnabled = (env = process.env) => isCountyPermitsEnabled('hamilton-county', env);
export const isButlerPermitsEnabled = (env = process.env) => isCountyPermitsEnabled('butler-county', env);

export function getAccelaConfig(env = process.env) {
    return {
        ...getPermitsConfig(env),
        lookbackDays: positive(env.LEAD_SOURCER_ACCELA_LOOKBACK_DAYS, 7, 31),
        maxPages: positive(env.LEAD_SOURCER_ACCELA_MAX_PAGES, 40, 100),
        maxDetails: positive(env.LEAD_SOURCER_ACCELA_MAX_DETAILS, 40, 200),
        minIntervalMs: positive(env.LEAD_SOURCER_ACCELA_MIN_INTERVAL_MS, 1000, 10000),
        timeoutMs: positive(env.LEAD_SOURCER_ACCELA_TIMEOUT_MS, 30000, 120000),
        retries: Math.max(0, Math.min(5, Number(env.LEAD_SOURCER_ACCELA_RETRIES ?? 2) || 0)),
        typeKeywords: parseList(env.LEAD_SOURCER_ACCELA_TYPE_KEYWORDS, DEFAULT_TYPE_KEYWORDS),
        typeExcludeKeywords: parseList(env.LEAD_SOURCER_ACCELA_TYPE_EXCLUDE, DEFAULT_TYPE_EXCLUDE_KEYWORDS),
    };
}

function includesAny(text, keywords) {
    const haystack = String(text || '').toLowerCase();
    return keywords.find((keyword) => haystack.includes(keyword)) || null;
}

/** Stage 1 (list row): record type must be an alteration/addition/remodel/repair. */
export function evaluateRecordType(row, config) {
    if (INACTIVE_STATUS_RE.test(row.status || '')) return { include: false, reason: 'inactive-status' };
    if (!row.detailUrl) return { include: false, reason: 'no-detail-link' };
    const type = String(row.recordType || '');
    const excluded = includesAny(type, config.typeExcludeKeywords);
    if (excluded) return { include: false, reason: 'excluded-type' };
    if (!includesAny(type, config.typeKeywords)) return { include: false, reason: 'other-type' };
    return { include: true, reason: 'type-match' };
}

/** City (or township) from "123 MAIN ST, WEST CHESTER OH 45069". */
export function cityFromAddress(address) {
    const match = String(address || '').match(/,\s*([A-Za-z .'-]+?)\s+OH\b/i);
    return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

/** Map a county permit (+ registry contact) onto the shared lead payload. */
export function buildCountyPermitLead(county, permit, contact = null, scoreResult = scorePermit(permit)) {
    const id = `${county.idPrefix}:${permit.permitNumber}`;
    const phone = permit.contractorPhone || contact?.phone || '';
    const email = permit.contractorEmail || contact?.email || '';
    const city = cityFromAddress(permit.address);
    const title = `${permit.contractor}: ${permit.recordType || 'Building permit'} at ${permit.address}`;
    const body = [
        `B2B prospect: contractor/contact of record on a new ${county.jurisdiction} permit. Internal only; do not auto-contact.`,
        `Contractor: ${permit.contractor}${permit.contactRole ? ` (${permit.contactRole})` : ''}`,
        `Contractor phone: ${phone || 'not listed'}`,
        `Contractor email: ${email || 'not listed'}`,
        `Contractor type: ${contact?.types?.join('; ') || permit.licenseType || 'unknown'}`,
        `Work: ${permit.description}`,
        `Job address: ${permit.address}`,
        `City/township: ${city || 'unknown'}`,
        `Estimated cost: ${permit.cost > 0 ? `$${Math.round(permit.cost).toLocaleString('en-US')}` : 'not stated'}`,
        `Record type: ${permit.recordType || 'unknown'}`,
        `Date: ${permit.date || 'unknown'}`,
        `Status: ${permit.status || 'unknown'}`,
        `Permit: ${permit.permitNumber}`,
    ].join('\n');

    const [month, day, year] = String(permit.date || '').split('/');
    const createdAt = year ? `${year}-${month}-${day}T00:00:00.000Z` : new Date().toISOString();
    const payload = buildAutomatedLeadPayload({
        id,
        source: county.source,
        title,
        body,
        url: permit.link || county.baseUrl,
        author: permit.contractor,
        createdAt,
        verdict: 'b2b',
        scoreResult,
    });
    // Contact data goes into the internal email body only; relay.js refuses to
    // email lead.email and internalOnly keeps the lead off the webhook.
    payload.lead.email = email;
    payload.lead.phone = phone;
    payload.metadata.internalOnly = true;
    payload.metadata.permitNumber = permit.permitNumber;
    payload.metadata.jurisdiction = county.jurisdiction;
    // Contact-free fields for the run report's top-leads list.
    payload.metadata.city = city || '';
    payload.metadata.estimatedCost = permit.cost > 0 ? permit.cost : null;
    payload.metadata.workSummary = String(permit.description || permit.recordType || '').slice(0, 120);
    // Structured fields for the internal lead notification email (src/lead-email.js).
    payload.metadata.permit = {
        jurisdiction: county.jurisdiction,
        address: permit.address || '',
        recordType: permit.recordType || '',
        description: permit.description || '',
        contractorType: contact?.types?.join('; ') || permit.licenseType || '',
        contactRole: permit.contactRole || '',
        date: permit.date || '',
        status: permit.status || '',
    };
    if (payload.metadata.routeId !== `lead-sourcer/${county.source}`) throw new Error(`unexpected routeId ${payload.metadata.routeId}`);
    return payload;
}

function createStats() {
    return {
        status: 'ok', fetched: 0, pages: 0, typeCandidates: 0, detailFetches: 0, detailCapped: 0, evaluated: 0,
        matches: 0, rejects: 0, skippedSeen: 0, relayed: 0, contractorFound: 0, contactFound: 0,
        registryStatus: 'skipped', registryMatched: 0, requests: 0, durationMs: 0, rejectReasons: {},
    };
}

export async function pollCountyPermits(countyKey, {
    mode = 'review-only',
    env = process.env,
    fetchImpl = fetch,
    sleep,
    now = new Date(),
    loadRegistry = loadContractorRegistry,
    isSeen = defaultIsSeen,
    markSeen = defaultMarkSeen,
    relayFn = defaultRelay,
    logReview = logReviewCandidate,
} = {}) {
    const county = COUNTY_SOURCES[countyKey];
    if (!county) throw new Error(`unknown county source ${countyKey}`);
    const tag = `[${county.source}]`;
    const startedAt = Date.now();
    const modeFlags = runModeFlags(mode);
    const config = getAccelaConfig(env);
    const stats = createStats();
    const matches = [];
    const reject = (reason) => {
        stats.rejects += 1;
        stats.rejectReasons[reason] = (stats.rejectReasons[reason] || 0) + 1;
    };
    const client = createAccelaClient({
        baseUrl: county.baseUrl,
        fetchImpl,
        ...(sleep ? { sleep } : {}),
        minIntervalMs: config.minIntervalMs,
        timeoutMs: config.timeoutMs,
        retries: config.retries,
    });
    const finish = () => {
        stats.requests = client.requestCount;
        stats.durationMs = Date.now() - startedAt;
        return { matches, stats };
    };

    let records;
    try {
        const since = new Date(now.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000);
        const result = await client.searchByDate({ startDate: formatAcaDate(since), endDate: formatAcaDate(now), maxPages: config.maxPages });
        records = result.records;
        stats.pages = result.pages;
        stats.fetched = records.length;
        if (result.truncated) console.warn(`${tag} search hit the ${config.maxPages}-page cap; older records in the window were not read.`);
    } catch (error) {
        stats.status = 'degraded';
        stats.error = String(error?.message || error);
        console.warn(`${tag} ${county.label} search unavailable; skipping this run: ${stats.error}`);
        return finish();
    }

    // Stage 1: list rows (type, and description when the grid has one).
    const shortlist = [];
    for (const row of records) {
        if (county.skipRecord(row)) continue;
        const id = `${county.idPrefix}:${row.recordNumber}`;
        if (isSeen(id)) {
            stats.skippedSeen += 1;
            continue;
        }
        stats.evaluated += 1;
        const typeVerdict = evaluateRecordType(row, config);
        if (!typeVerdict.include) {
            reject(typeVerdict.reason);
            continue;
        }
        stats.typeCandidates += 1;
        // Grids with a description let us skip detail fetches; blank descriptions still get a detail read.
        if (county.hasListDescription && row.description && !includesAny(`${row.recordType} ${row.description}`, config.keywords)) {
            reject('no-keyword');
            continue;
        }
        shortlist.push({ row, id });
    }

    // A detail page that was read and definitively rejected (owner-pulled, no
    // keyword, excluded trade) is remembered so later runs don't re-fetch it.
    // Records with no contractor yet are left unseen and retried.
    const rememberFinal = (id) => {
        if (modeFlags.shouldPersistSeen) markSeen(id);
    };

    // Stage 2: detail pages for the shortlist only, capped per run.
    const candidates = [];
    for (const { row, id } of shortlist) {
        if (stats.detailFetches >= config.maxDetails) {
            stats.detailCapped += 1;
            continue;
        }
        let detail;
        try {
            stats.detailFetches += 1;
            detail = await client.fetchDetail(row.detailUrl);
        } catch (error) {
            console.warn(`${tag} detail ${row.recordNumber} failed: ${error?.message || error}`);
            reject('detail-error');
            continue;
        }
        const listDescription = String(row.description || '').trim();
        const description = !listDescription || detail.description.toLowerCase().includes(listDescription.toLowerCase())
            ? detail.description || listDescription
            : `${listDescription} ${detail.description}`.trim();
        const picked = pickContractor(detail);
        if (picked.contractor) stats.contractorFound += 1;
        const permit = {
            permitNumber: row.recordNumber,
            recordType: row.recordType,
            date: row.date,
            status: row.status,
            address: row.address || detail.workLocation,
            description,
            cost: detail.cost,
            link: row.detailUrl,
            contractor: picked.contractor?.company || '',
            contactRole: picked.contractor?.role || '',
            licenseType: picked.contractor?.licenseType || '',
            contractorPhone: picked.contractor?.phone || '',
            contractorEmail: picked.contractor?.email || '',
        };
        if (!picked.contractor) {
            reject(picked.reason);
            if (picked.reason === 'owner-pulled') rememberFinal(id);
            continue;
        }
        // Shared keyword / exclusion / contractor-trade rules from permits.js.
        const verdict = evaluatePermit({ ...permit, status: '' }, config);
        if (!verdict.include) {
            reject(verdict.reason.split(':')[0]);
            rememberFinal(id);
            continue;
        }
        const scoreResult = scorePermit(permit);
        if (scoreResult.score < config.minScore) {
            reject('below-min-score');
            continue;
        }
        candidates.push({ permit, id, scoreResult });
    }
    if (stats.detailCapped > 0) console.warn(`${tag} detail cap (${config.maxDetails}) reached; ${stats.detailCapped} candidate(s) left for the next run.`);

    let registry = { index: new Map(), status: 'skipped' };
    if (candidates.length > 0 && config.enrich) {
        try {
            registry = await loadRegistry({ fetchImpl, env, now });
        } catch (error) {
            console.warn(`${tag} Registry enrichment skipped: ${error?.message || error}`);
            registry = { index: new Map(), status: 'unavailable' };
        }
    }
    stats.registryStatus = registry.status;

    for (const { permit, id, scoreResult } of candidates) {
        const contact = lookupContractor(registry.index, permit.contractor);
        if (contact) stats.registryMatched += 1;
        const payload = buildCountyPermitLead(county, permit, contact, scoreResult);
        if (payload.lead.email || payload.lead.phone) stats.contactFound += 1;
        stats.matches += 1;

        if (!modeFlags.shouldRelay) {
            // Review log is uploaded as a run artifact: keep contact details out of it.
            logReview({
                mode,
                source: county.source,
                post: { id, title: `${permit.contractor}: ${permit.description}`.slice(0, 300), url: permit.link, createdAt: permit.date },
                classification: { score: scoreResult.score, band: scoreResult.band, hasPhone: Boolean(payload.lead.phone), hasEmail: Boolean(payload.lead.email) },
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

    finish();
    console.log(`${tag} fetched=${stats.fetched} pages=${stats.pages} evaluated=${stats.evaluated} typeCandidates=${stats.typeCandidates} details=${stats.detailFetches} contractors=${stats.contractorFound} matches=${stats.matches} rejects=${stats.rejects} seen=${stats.skippedSeen} registry=${stats.registryStatus} enriched=${stats.registryMatched}/${stats.matches} contact=${stats.contactFound}/${stats.matches} requests=${stats.requests} ms=${stats.durationMs}`);
    return { matches, stats };
}

export const pollHamiltonPermits = (options) => pollCountyPermits('hamilton-county', options);
export const pollButlerPermits = (options) => pollCountyPermits('butler-county', options);

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    const countyKey = process.argv[2] || 'hamilton-county';
    pollCountyPermits(countyKey, { mode: resolveRunMode() }).catch((error) => {
        console.error(`[permits-accela] Fatal error (${countyKey}):`, error);
        process.exitCode = 1;
    });
}
