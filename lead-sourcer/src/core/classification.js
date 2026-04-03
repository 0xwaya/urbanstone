import {
    EXCLUDE_KEYWORDS,
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

    let verdict = 'reject';
    if (excluded.length > 0) {
        verdict = 'reject';
    } else if (anchored && intentSignals.length > 0) {
        verdict = 'match';
    } else if (anchored && projectContext.length > 0 && intentSignals.length > 0) {
        verdict = 'match';
    } else if (
        anchored
        || (projectContext.length > 0 && intentSignals.length > 0)
    ) {
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

    const primary = VERDICT_RANK[titleResult.verdict] >= VERDICT_RANK[bodyResult.verdict]
        ? titleResult
        : bodyResult;

    return {
        verdict: primary.verdict,
        title: titleResult,
        body: bodyResult,
    };
}

export function matchesKeywords(text) {
    return classifyLeadText(text).verdict === 'match';
}