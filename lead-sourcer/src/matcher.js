import {
    EXCLUDE_KEYWORDS,
    INTENT_KEYWORDS,
    MATCH_KEYWORDS,
    MATERIAL_SIGNAL_KEYWORDS,
    PROJECT_CONTEXT_KEYWORDS,
} from './config.js';

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Returns true if the text contains at least one lead keyword.
 * Case-insensitive normalized substring matching.
 */
export function matchesKeywords(text) {
    if (!text) return false;
    const normalized = normalizeText(text);

    const isExplicitlyExcluded = EXCLUDE_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));
    if (isExplicitlyExcluded) return false;

    const hasDirectMatch = MATCH_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));
    const hasMaterialSignal = MATERIAL_SIGNAL_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));
    const hasProjectContext = PROJECT_CONTEXT_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));
    const hasIntent = INTENT_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));

    if (hasDirectMatch && hasIntent) return true;
    if (hasMaterialSignal && hasProjectContext && hasIntent) return true;
    return false;
}

/**
 * Returns true if the post is within the age threshold.
 * @param {number} createdUtcSeconds - Unix timestamp in seconds
 * @param {number} maxAgeHours
 */
export function isRecent(createdUtcSeconds, maxAgeHours) {
    const ageMs = Date.now() - createdUtcSeconds * 1000;
    return ageMs < maxAgeHours * 60 * 60 * 1000;
}

/**
 * Build a canonical lead payload for an outbound match so it flows
 * through the same Zapier → Outlook pipeline as form submissions.
 */
export function buildLeadPayload({ id, source, title, body, url, author, createdAt }) {
    return {
        submittedAt: createdAt,
        source,
        lead: {
            name: author || 'Anonymous',
            email: null,
            phone: null,
            projectDetails: `[${source.toUpperCase()} MATCH]\n\nTitle: ${title}\n\n${body || ''}\n\nPost URL: ${url}`,
            externalPostId: id,
            externalPostUrl: url,
        },
        metadata: {
            routeId: `lead-sourcer/${source}`,
            dedupeKey: id,
            automated: true,
        },
    };
}
