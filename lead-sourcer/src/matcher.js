import { MATCH_KEYWORDS } from './config.js';

/**
 * Returns true if the text contains at least one lead keyword.
 * Case-insensitive, whole-word boundary matching.
 */
export function matchesKeywords(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return MATCH_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
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
            automated: true,
        },
    };
}
