import {
    EXCLUDE_KEYWORDS,
    FB_MARKETPLACE_DEALER_KEYWORDS,
    FB_MARKETPLACE_REMODEL_KEYWORDS,
    FB_MARKETPLACE_SELLING_KEYWORDS,
    FB_MARKETPLACE_WANTED_KEYWORDS,
    INTENT_KEYWORDS,
    MATCH_KEYWORDS,
    MATERIAL_SIGNAL_KEYWORDS,
    PROJECT_CONTEXT_KEYWORDS,
} from '../config.js';

const VERDICT_RANK = {
    reject: 0,
    borderline: 1,
    match: 2,
};

const COUNTERTOP_ANCHOR_TERMS = new Set([
    'countertop',
    'counter top',
    'countertops',
    'counter tops',
    'granite',
    'quartz',
    'quartzite',
    'vanity top',
    'slab',
    'stone countertop',
    'granite countertop',
    'quartz countertop',
    'quartzite countertop',
]);

const SCORE_BANDS = [
    { min: 75, label: 'hot' },
    { min: 55, label: 'warm' },
    { min: 35, label: 'tepid' },
    { min: 0, label: 'cold' },
];

export function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findMatchedKeywords(normalized, keywords) {
    return keywords.filter((keyword) => normalized.includes(normalizeText(keyword)));
}

function hasCountertopAnchor(keywords) {
    return keywords.some((keyword) => COUNTERTOP_ANCHOR_TERMS.has(keyword));
}

function bandForScore(score) {
    return SCORE_BANDS.find((band) => score >= band.min)?.label || 'cold';
}

export function scoreLeadSignals(signals) {
    const directMatches = signals?.directMatches || [];
    const materialSignals = signals?.materialSignals || [];
    const projectContext = signals?.projectContext || [];
    const intentSignals = signals?.intentSignals || [];
    const excluded = signals?.excluded || [];
    const anchored = hasCountertopAnchor([...directMatches, ...materialSignals]);

    let score = 0;
    if (anchored) score += 35;
    if (directMatches.length > 0) score += 18;
    if (materialSignals.length > 0) score += 14;
    if (projectContext.length > 0) score += 16;
    if (intentSignals.length > 0) score += 16;
    if (excluded.length > 0) score -= 45;

    score = Math.max(0, Math.min(100, score));

    return {
        score,
        band: bandForScore(score),
        anchored,
        factors: {
            directMatches: directMatches.length,
            materialSignals: materialSignals.length,
            projectContext: projectContext.length,
            intentSignals: intentSignals.length,
            excluded: excluded.length,
        },
    };
}

export function classifyLeadText(text) {
    if (!text) {
        return {
            verdict: 'reject',
            normalized: '',
            signals: {
                excluded: [],
                directMatches: [],
                materialSignals: [],
                projectContext: [],
                intentSignals: [],
            },
        };
    }

    const normalized = normalizeText(text);
    const excluded = findMatchedKeywords(normalized, EXCLUDE_KEYWORDS);
    const directMatches = findMatchedKeywords(normalized, MATCH_KEYWORDS);
    const materialSignals = findMatchedKeywords(normalized, MATERIAL_SIGNAL_KEYWORDS);
    const projectContext = findMatchedKeywords(normalized, PROJECT_CONTEXT_KEYWORDS);
    const intentSignals = findMatchedKeywords(normalized, INTENT_KEYWORDS);
    const anchored = hasCountertopAnchor([...directMatches, ...materialSignals]);
    const hasProjectContext = projectContext.length > 0;
    const hasIntent = intentSignals.length > 0;
    const hasDirectMatch = directMatches.length > 0;

    let verdict = 'reject';
    if (excluded.length > 0) {
        verdict = 'reject';
    } else if (anchored && (hasIntent || hasProjectContext)) {
        verdict = 'match';
    } else if (hasProjectContext && hasIntent) {
        verdict = 'match';
    } else if (hasDirectMatch && hasIntent) {
        verdict = 'match';
    } else if (anchored) {
        verdict = 'match';  // Material anchor alone is strong enough signal for countertop work
    } else if (hasProjectContext || hasDirectMatch) {
        verdict = 'borderline';
    }

    return {
        verdict,
        normalized,
        signals: {
            excluded,
            directMatches,
            materialSignals,
            projectContext,
            intentSignals,
        },
    };
}

export function classifyLeadCandidate({ title = '', body = '' }) {
    const titleResult = classifyLeadText(title);
    const bodyResult = classifyLeadText(body);
    const combinedResult = classifyLeadText(`${title}\n${body}`);

    const primary = [titleResult, bodyResult, combinedResult].reduce((best, current) => (
        VERDICT_RANK[current.verdict] > VERDICT_RANK[best.verdict] ? current : best
    ), titleResult);

    return {
        verdict: primary.verdict,
        title: titleResult,
        body: bodyResult,
        combined: combinedResult,
    };
}

export function scoreLeadCandidate(classification) {
    const combinedSignals = classification?.combined?.signals;
    return scoreLeadSignals(combinedSignals || {});
}

export function matchesKeywords(text) {
    return classifyLeadText(text).verdict === 'match';
}
// ---------------------------------------------------------------------------
// Facebook Marketplace: selling vs. buying.
//
// Marketplace is almost entirely sellers, so the generic "material anchor alone is a
// match" rule above would turn every "granite countertop for sale" into a lead.
// Marketplace listings go through this function instead:
//   dealer   -> reject (fabricators, remnant yards, competitor ads)
//   wanted   -> match  (ISO / wanted / looking for / need installed) — needs a
//               countertop anchor or project context
//   remodel  -> review (homeowner selling old counters/cabinets mid-remodel);
//               logged for manual review only, never relayed, never auto-drafted
//   inventory-> reject (priced listing or selling language, no wanted/remodel signal)
//   other    -> reject
// ---------------------------------------------------------------------------

const MARKETPLACE_REMODEL_OBJECT_TERMS = [
    'countertop', 'countertops', 'counter top', 'counter tops', 'counters', 'granite', 'quartz',
    'quartzite', 'marble', 'cabinet', 'cabinets', 'vanity', 'vanity top', 'sink', 'backsplash', 'slab',
];

function findWholePhrases(normalized, phrases) {
    const padded = ` ${normalized} `;
    return phrases.filter((phrase) => {
        const needle = normalizeText(phrase);
        return needle && padded.includes(` ${needle} `);
    });
}

function hasRealPrice(price) {
    const amount = Number(price);
    // $0 / $1 / $2 are the conventional "price" on ISO and free-to-claim posts.
    return Number.isFinite(amount) && amount > 2;
}

export function classifyMarketplaceListing({ title = '', body = '', price = null } = {}) {
    const base = classifyLeadCandidate({ title, body });
    const titleNorm = normalizeText(title);
    const allNorm = normalizeText(`${title}\n${body}`);

    const dealer = findWholePhrases(allNorm, FB_MARKETPLACE_DEALER_KEYWORDS);
    const wantedInTitle = findWholePhrases(titleNorm, FB_MARKETPLACE_WANTED_KEYWORDS);
    const wantedAnywhere = findWholePhrases(allNorm, FB_MARKETPLACE_WANTED_KEYWORDS);
    const remodel = findWholePhrases(allNorm, FB_MARKETPLACE_REMODEL_KEYWORDS);
    const remodelObjects = findWholePhrases(allNorm, MARKETPLACE_REMODEL_OBJECT_TERMS);
    const selling = findWholePhrases(allNorm, FB_MARKETPLACE_SELLING_KEYWORDS);
    const priced = hasRealPrice(price);

    const combinedSignals = base.combined?.signals || {};
    const anchored = hasCountertopAnchor([
        ...(combinedSignals.directMatches || []),
        ...(combinedSignals.materialSignals || []),
    ]) || remodelObjects.some((term) => COUNTERTOP_ANCHOR_TERMS.has(term) || term === 'counters');
    const hasProjectContext = (combinedSignals.projectContext || []).length > 0;

    // "Looking for" inside a seller's description ("great for anyone looking for...") is
    // not demand, so body-only wanted phrases count only on unpriced posts.
    const wanted = wantedInTitle.length > 0 ? wantedInTitle : (priced ? [] : wantedAnywhere);

    let kind = 'other';
    if (dealer.length > 0) {
        kind = 'dealer';
    } else if (wanted.length > 0 && (anchored || hasProjectContext)) {
        kind = 'wanted';
    } else if (remodel.length > 0 && remodelObjects.length > 0) {
        kind = 'remodel';
    } else if (priced || selling.length > 0) {
        kind = 'inventory';
    }

    const verdict = kind === 'wanted' ? 'match' : kind === 'remodel' ? 'review' : 'reject';

    return {
        ...base,
        verdict,
        marketplace: {
            kind,
            priced,
            signals: { dealer, wanted, remodel, remodelObjects, selling },
        },
    };
}
