/**
 * Cincinnati building-permit poller (B2B prospects).
 *
 * Finds recently issued residential permits whose work description mentions
 * kitchens, baths, counters or remodels (City of Cincinnati open data, Socrata),
 * joins the contractor of record, enriches it from the city's contractor
 * registry and relays each new permit as an internal lead to sales@.
 *
 * These are contractors who may need a countertop fabricator, not homeowner
 * quote requests. Nothing here contacts the contractor: delivery goes through
 * relay.js, which only emails the internal sales inbox.
 *
 * Off by default (LEAD_SOURCER_ENABLE_PERMITS). Network/data failures degrade
 * the source and warn; they never throw out of pollPermits.
 */
import { pathToFileURL } from 'node:url';
import { buildAutomatedLeadPayload } from './core/payload.js';
import { isSeen as defaultIsSeen, markSeen as defaultMarkSeen } from './dedup.js';
import { deliverLead, relay as defaultRelay } from './relay.js';
import { resolveRunMode, runModeFlags } from './mode.js';
import { logReviewCandidate } from './review-log.js';
import { loadContractorRegistry, lookupContractor } from './contractor-registry.js';

export const SOCRATA_BASE = 'https://data.cincinnati-oh.gov/resource';
export const COMBO_DATASET = 'thvx-5mem'; // Building combo permits with desc_of_work
export const PERMITS_DATASET = 'uhjb-xac9'; // Building permits with companyname, cost, link
export const DATASET_PAGE_URL = 'https://data.cincinnati-oh.gov/Thriving-Neighborhoods/Cincinnati-Building-Permits/uhjb-xac9';

export const DEFAULT_PERMIT_KEYWORDS = ['kitchen', 'bath', 'counter', 'vanity', 'remodel', 'renovat'];
export const DEFAULT_PERMIT_EXCLUDE_KEYWORDS = [
    'basement waterproof', 'waterproofing', 'foundation', 'underpin', 'solar', 'deck', 'roof', 'hvac',
    'furnace', 'air condition', 'porch', 'fence', 'garage', 'siding', 'window replacement', 'retaining wall',
    'fire damage', 'fire escape', 'demolition', 'egress',
];
// Contractor names that indicate a trade that never buys countertops.
export const DEFAULT_CONTRACTOR_EXCLUDE_KEYWORDS = [
    'basement', 'waterproof', 'groundworks', 'foundation', 'solar', 'deck', 'roofing', 'heating', 'hvac',
    'sustainergy', 'acculevel', 'fence', 'pool',
];
// A strong countertop signal keeps a permit even when an exclude term also appears
// (e.g. "new rear deck / new kitchen").
const STRONG_KEYWORDS = ['kitchen', 'counter', 'vanity'];
const INACTIVE_STATUSES = new Set(['VOID', 'WITHDRWN', 'EXPIRED', 'APP_EXP']);
const DEFAULT_LOOKBACK_DAYS = 14;
const DEFAULT_TIMEOUT_MS = 30000;
const JOIN_CHUNK_SIZE = 100;

function envFlag(value, defaultValue) {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return defaultValue;
    return !['0', 'false', 'no', 'off'].includes(raw);
}

/** Permits are opt-in: disabled unless LEAD_SOURCER_ENABLE_PERMITS is truthy. */
export function isPermitsEnabled(env = process.env) {
    return envFlag(env.LEAD_SOURCER_ENABLE_PERMITS, false);
}

function parseList(value, fallback) {
    const list = String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
    return list.length > 0 ? list : fallback;
}

export function getPermitsConfig(env = process.env) {
    const lookback = Number(env.LEAD_SOURCER_PERMITS_LOOKBACK_DAYS || DEFAULT_LOOKBACK_DAYS);
    const minScore = Number(env.LEAD_SOURCER_PERMITS_MIN_SCORE || 0);
    return {
        lookbackDays: Number.isFinite(lookback) && lookback > 0 ? Math.min(lookback, 365) : DEFAULT_LOOKBACK_DAYS,
        // Only letters/spaces survive so keywords can be embedded safely in SoQL.
        keywords: parseList(env.LEAD_SOURCER_PERMITS_KEYWORDS, DEFAULT_PERMIT_KEYWORDS)
            .map((keyword) => keyword.replace(/[^a-z ]/g, '').trim())
            .filter(Boolean),
        excludeKeywords: parseList(env.LEAD_SOURCER_PERMITS_EXCLUDE_KEYWORDS, DEFAULT_PERMIT_EXCLUDE_KEYWORDS),
        contractorExcludeKeywords: parseList(env.LEAD_SOURCER_PERMITS_CONTRACTOR_EXCLUDE, DEFAULT_CONTRACTOR_EXCLUDE_KEYWORDS),
        minScore: Number.isFinite(minScore) ? minScore : 0,
        appToken: String(env.SOCRATA_APP_TOKEN || '').trim(),
        timeoutMs: Number(env.LEAD_SOURCER_PERMITS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
        enrich: envFlag(env.LEAD_SOURCER_PERMITS_REGISTRY_ENRICH, true),
    };
}

function isoDay(date) {
    return date.toISOString().slice(0, 10);
}

export function buildComboQuery({ keywords, lookbackDays, now = new Date() }) {
    const since = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const keywordClause = keywords.map((keyword) => `upper(desc_of_work) like '%${keyword.toUpperCase()}%'`).join(' OR ');
    return {
        $select: 'number_key,sub_type_desc,code_book,dwelling_units,date_issued,location,desc_of_work,data_status',
        $where: `code_book='Residential' AND date_issued >= '${isoDay(since)}T00:00:00' AND (${keywordClause})`,
        $order: 'date_issued DESC',
        $limit: '1000',
    };
}

async function fetchSocrata(dataset, params, { fetchImpl, appToken, timeoutMs }) {
    const url = `${SOCRATA_BASE}/${dataset}.json?${new URLSearchParams(params).toString()}`;
    const headers = { Accept: 'application/json' };
    if (appToken) headers['X-App-Token'] = appToken;
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Socrata ${dataset} HTTP ${response.status} ${detail.slice(0, 200)}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`Socrata ${dataset} returned a non-array response`);
    return data;
}

function stripQuotes(value) {
    return String(value || '').replace(/^"+|"+$/g, '').trim();
}

/** Combo rows repeat per review item; collapse them to one record per permit. */
export function groupComboRows(rows = []) {
    const byPermit = new Map();
    for (const row of rows) {
        const permitNumber = String(row?.number_key || '').trim();
        if (!permitNumber) continue;
        const existing = byPermit.get(permitNumber);
        const description = String(row.desc_of_work || '').replace(/\s+/g, ' ').trim();
        if (!existing) {
            byPermit.set(permitNumber, {
                permitNumber,
                subType: row.sub_type_desc || '',
                dwellingUnits: row.dwelling_units || '',
                issuedAt: row.date_issued || '',
                address: String(row.location || '').replace(/\s+/g, ' ').trim(),
                description,
                status: row.data_status || '',
            });
        } else if (description && !existing.description.includes(description)) {
            existing.description = `${existing.description} ${description}`.trim();
        }
    }
    return [...byPermit.values()];
}

/** Pick contractor, cost, zip and link from the permit rows that share a number. */
export function summarizePermitRows(rows = []) {
    const byPermit = new Map();
    for (const row of rows) {
        const permitNumber = String(row?.permitnum || '').trim();
        if (!permitNumber) continue;
        const entry = byPermit.get(permitNumber) || { contractor: '', cost: 0, zip: '', link: '', isBuilding: false };
        const company = stripQuotes(row.companyname);
        const isBuilding = row.permittypemapped === 'Building';
        if (company && (!entry.contractor || (isBuilding && !entry.isBuilding))) {
            entry.contractor = company;
            entry.isBuilding = isBuilding;
        }
        const cost = Number(row.estprojectcostdec);
        if (Number.isFinite(cost) && cost > entry.cost) entry.cost = cost;
        entry.zip = entry.zip || String(row.originalzip || '').trim();
        entry.link = entry.link || String(row.link || '').trim();
        byPermit.set(permitNumber, entry);
    }
    return byPermit;
}

function includesAny(text, keywords) {
    const haystack = String(text || '').toLowerCase();
    return keywords.find((keyword) => haystack.includes(keyword)) || null;
}

/** Decide whether a joined permit is a countertop-relevant contractor prospect. */
export function evaluatePermit(permit, config) {
    if (INACTIVE_STATUSES.has(String(permit.status || '').toUpperCase())) return { include: false, reason: 'inactive-status' };
    const contractor = String(permit.contractor || '').trim();
    if (!contractor) return { include: false, reason: 'no-contractor' };
    if (/^owner\b/i.test(contractor)) return { include: false, reason: 'owner-pulled' };
    if (!includesAny(permit.description, config.keywords)) return { include: false, reason: 'no-keyword' };

    const contractorExcluded = includesAny(contractor, config.contractorExcludeKeywords);
    if (contractorExcluded) return { include: false, reason: `excluded-contractor:${contractorExcluded}` };
    const excluded = includesAny(permit.description, config.excludeKeywords);
    if (excluded && !includesAny(permit.description, STRONG_KEYWORDS)) return { include: false, reason: `excluded-trade:${excluded}` };
    return { include: true, reason: 'match' };
}

/** Simple score: kitchen/counter > bath/vanity > remodel, plus a cost bonus. */
export function scorePermit({ description, cost }) {
    const text = String(description || '').toLowerCase();
    let base = 0;
    if (text.includes('counter')) base = 70;
    else if (text.includes('kitchen')) base = 60;
    else if (text.includes('bath') || text.includes('vanity')) base = 45;
    else if (text.includes('remodel') || text.includes('renovat')) base = 30;

    const amount = Number(cost) || 0;
    const costBonus = amount >= 100000 ? 20 : amount >= 50000 ? 15 : amount >= 20000 ? 10 : amount >= 5000 ? 5 : 0;
    const score = Math.min(100, base + costBonus);
    const band = score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';
    return { score, band, anchored: true, factors: { directMatches: base > 0 ? 1 : 0, materialSignals: text.includes('counter') ? 1 : 0, projectContext: 1, intentSignals: 0, excluded: 0 } };
}

function formatCost(cost) {
    return cost > 0 ? `$${Math.round(cost).toLocaleString('en-US')}` : 'not stated';
}

/** Map a joined permit (+ optional registry contact) onto the shared lead payload. */
export function buildPermitLead(permit, contact = null, scoreResult = scorePermit(permit)) {
    const id = `permits:${permit.permitNumber}`;
    const issuedDay = String(permit.issuedAt || '').slice(0, 10);
    const title = `${permit.contractor}: ${permit.subType || 'Residential permit'} at ${permit.address}`;
    const body = [
        'B2B prospect: contractor of record on a newly issued City of Cincinnati permit. Internal only; do not auto-contact.',
        `Contractor: ${permit.contractor}`,
        `Contractor phone: ${contact?.phone || 'not in registry'}`,
        `Contractor email: ${contact?.email || 'not in registry'}`,
        `Contractor type: ${contact?.types?.join('; ') || 'unknown'}`,
        `Work: ${permit.description}`,
        `Job address: ${permit.address}, Cincinnati, OH ${permit.zip || ''}`.trim(),
        `Estimated cost: ${formatCost(permit.cost)}`,
        `Issued: ${issuedDay || 'unknown'}`,
        `Status: ${permit.status || 'unknown'}`,
        `Permit: ${permit.permitNumber}`,
    ].join('\n');

    const payload = buildAutomatedLeadPayload({
        id,
        source: 'permits',
        title,
        body,
        url: permit.link || DATASET_PAGE_URL,
        author: permit.contractor,
        createdAt: issuedDay ? `${issuedDay}T00:00:00.000Z` : new Date().toISOString(),
        verdict: 'b2b',
        scoreResult,
    });

    // Real contact data goes into the internal email body only; delivery never
    // targets lead.email (see relay.js guard), and internalOnly keeps it off the webhook.
    payload.lead.email = contact?.email || '';
    payload.lead.phone = contact?.phone || '';
    payload.metadata.internalOnly = true;
    payload.metadata.permitNumber = permit.permitNumber;
    // Contact-free fields for the run report's top-leads list.
    payload.metadata.city = `Cincinnati${permit.zip ? ` ${permit.zip}` : ''}`;
    payload.metadata.estimatedCost = permit.cost > 0 ? permit.cost : null;
    payload.metadata.workSummary = String(permit.description || permit.subType || '').slice(0, 120);
    return payload;
}

function createStats() {
    return {
        status: 'ok', fetched: 0, evaluated: 0, matches: 0, rejects: 0, skippedSeen: 0, relayed: 0,
        registryStatus: 'skipped', registryMatched: 0, rejectReasons: {},
    };
}

async function joinPermitDetails(permits, { fetchImpl, appToken, timeoutMs }) {
    const rows = [];
    for (let i = 0; i < permits.length; i += JOIN_CHUNK_SIZE) {
        const numbers = permits.slice(i, i + JOIN_CHUNK_SIZE).map((p) => `'${p.permitNumber.replace(/[^A-Za-z0-9-]/g, '')}'`);
        rows.push(...await fetchSocrata(PERMITS_DATASET, {
            $select: 'permitnum,companyname,estprojectcostdec,originalzip,link,permittypemapped',
            $where: `permitnum in(${numbers.join(',')})`,
            $limit: '5000',
        }, { fetchImpl, appToken, timeoutMs }));
    }
    const details = summarizePermitRows(rows);
    return permits.map((permit) => ({ ...permit, ...(details.get(permit.permitNumber) || { contractor: '', cost: 0, zip: '', link: '' }) }));
}

export async function pollPermits({
    mode = 'review-only',
    env = process.env,
    fetchImpl = fetch,
    now = new Date(),
    loadRegistry = loadContractorRegistry,
    isSeen = defaultIsSeen,
    markSeen = defaultMarkSeen,
    relayFn = defaultRelay,
    logReview = logReviewCandidate,
} = {}) {
    const modeFlags = runModeFlags(mode);
    const config = getPermitsConfig(env);
    const stats = createStats();
    const matches = [];
    const reject = (reason) => {
        stats.rejects += 1;
        stats.rejectReasons[reason] = (stats.rejectReasons[reason] || 0) + 1;
    };

    let permits;
    try {
        const comboRows = await fetchSocrata(COMBO_DATASET, buildComboQuery({ ...config, now }), { fetchImpl, ...config });
        permits = groupComboRows(comboRows);
        stats.fetched = permits.length;
        permits = await joinPermitDetails(permits, { fetchImpl, ...config });
    } catch (error) {
        stats.status = 'degraded';
        stats.error = String(error?.message || error);
        console.warn(`[permits] City permit data unavailable; skipping this run: ${stats.error}`);
        return { matches, stats };
    }

    const candidates = [];
    for (const permit of permits) {
        const id = `permits:${permit.permitNumber}`;
        if (isSeen(id)) {
            stats.skippedSeen += 1;
            continue;
        }
        stats.evaluated += 1;
        const verdict = evaluatePermit(permit, config);
        if (!verdict.include) {
            reject(verdict.reason.split(':')[0]);
            continue;
        }
        const scoreResult = scorePermit(permit);
        if (scoreResult.score < config.minScore) {
            reject('below-min-score');
            continue;
        }
        candidates.push({ permit, id, scoreResult });
    }

    let registry = { index: new Map(), status: 'skipped' };
    if (candidates.length > 0 && config.enrich) {
        try {
            registry = await loadRegistry({ fetchImpl, env, now });
        } catch (error) {
            console.warn(`[permits] Registry enrichment skipped: ${error?.message || error}`);
            registry = { index: new Map(), status: 'unavailable' };
        }
    }
    stats.registryStatus = registry.status;

    for (const { permit, id, scoreResult } of candidates) {
        const contact = lookupContractor(registry.index, permit.contractor);
        if (contact) stats.registryMatched += 1;
        const payload = buildPermitLead(permit, contact, scoreResult);
        stats.matches += 1;

        if (!modeFlags.shouldRelay) {
            // Review log is uploaded as a run artifact: keep contact details out of it.
            logReview({
                mode,
                source: 'permits',
                post: { id, title: `${permit.contractor}: ${permit.description}`.slice(0, 300), url: permit.link, createdAt: permit.issuedAt },
                classification: { score: scoreResult.score, band: scoreResult.band, hasPhone: Boolean(contact?.phone), hasEmail: Boolean(contact?.email) },
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

    console.log(`[permits] fetched=${stats.fetched} evaluated=${stats.evaluated} matches=${stats.matches} rejects=${stats.rejects} seen=${stats.skippedSeen} registry=${stats.registryStatus} enriched=${stats.registryMatched}/${stats.matches}`);
    return { matches, stats };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    pollPermits({ mode: resolveRunMode() }).catch((error) => {
        console.error('[permits] Fatal error:', error);
        process.exitCode = 1;
    });
}
