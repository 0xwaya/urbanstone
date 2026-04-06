import {
    classifyLeadCandidate,
    classifyLeadText,
    matchesKeywords,
    normalizeText,
    scoreLeadCandidate,
} from './core/classification.js';
import { buildAutomatedLeadPayload } from './core/payload.js';

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
export function buildLeadPayload(
    { id, source, title, body, url, author, createdAt, subreddit = null },
    { verdict = null, scoreResult = null } = {},
) {
    return buildAutomatedLeadPayload({
        id,
        source,
        title,
        body,
        url,
        author,
        createdAt,
        sourceSubreddit: subreddit,
        verdict,
        scoreResult,
    });
}

export { classifyLeadCandidate, classifyLeadText, matchesKeywords, normalizeText, scoreLeadCandidate };
