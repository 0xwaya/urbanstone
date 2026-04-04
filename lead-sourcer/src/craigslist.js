/**
 * Craigslist HTML search poller.
 * Craigslist's RSS endpoint returns 403; the static HTML search page is accessible.
 * Parses cl-static-search-result items directly from the no-JS HTML.
 */
import { CRAIGSLIST_BASE, CRAIGSLIST_SECTIONS, CRAIGSLIST_BODY_FETCH_LIMIT, CRAIGSLIST_REQUEST_DELAY_MS } from './config.js';
import { buildLeadPayload, classifyLeadCandidate, scoreLeadCandidate } from './matcher.js';
import { isSeen, markSeen } from './dedup.js';
import 'dotenv/config';
import { relay } from './relay.js';
import { CRAIGSLIST_QUERY_KEYWORDS } from './config.js';
import { CRAIGSLIST_LISTING_NOISE_KEYWORDS, LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD } from './config.js';
import { resolveRunMode } from './mode.js';
import { runModeFlags } from './mode.js';
import { logNearMissCandidate, logReviewCandidate } from './review-log.js';

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};

function hasAnyKeyword(text, keywords) {
    const haystack = String(text || '').toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function isCraigslistListingNoise(post) {
    return hasAnyKeyword(`${post.title}\n${post.body}`, CRAIGSLIST_LISTING_NOISE_KEYWORDS);
}

// Additional noise patterns that appear in real-estate/housing section body text
// (property listings advertising granite as an amenity, not service requests).
const PROPERTY_LISTING_NOISE_PATTERNS = [
    /\d+\s*(bed|bath|br|ba)\b/i,
    /sq\.?\s*ft/i,
    /\$\s*\d{3,}\s*\/(mo|month)/i,
    /open house/i,
    /listed at/i,
    /\bfor sale\b/i,
    /\bfor rent\b/i,
    /move.?in ready/i,
    /newly remodeled (unit|condo|apt)/i,
];

function isPropertyListingBody(text) {
    const haystack = String(text || '');
    return PROPERTY_LISTING_NOISE_PATTERNS.some((pattern) => pattern.test(haystack));
}

/**
 * Fetch the full body text from an individual Craigslist listing page.
 * Returns empty string on any failure — the caller falls back to title-only classification.
 */
async function fetchListingBody(url) {
    try {
        const response = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) });
        if (!response.ok) return '';
        const html = await response.text();
        // Primary container used by Craigslist posting pages.
        const bodyMatch = html.match(/<section[^>]*class="[^"]*userbody[^"]*"[^>]*>([\s\S]*?)<\/section>/i)
            || html.match(/<div[^>]*id="postingbody"[^>]*>([\s\S]*?)<\/div>/i);
        if (!bodyMatch) return '';
        // Strip tags, decode common HTML entities, collapse whitespace.
        return bodyMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&#\d+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 2000);
    } catch {
        return '';
    }
}

async function fetchSearchPage(section, keyword) {
    const encoded = encodeURIComponent(keyword);
    const url = `${CRAIGSLIST_BASE}${section.path}?query=${encoded}&sort=date`;

    const response = await fetch(url, { headers: BROWSER_HEADERS });

    if (!response.ok) {
        const error = new Error(`Craigslist fetch failed (${section.label}/${keyword}): ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return response.text();
}

function parseResultsFromHtml(html) {
    const results = [];
    // Match actual result items (have title attribute, distinct from hub-links)
    const itemRe = /<li\s+class="cl-static-search-result"\s+title="([^"]+)"[^>]*>[\s\S]*?<a\s+href="(https:\/\/[^"]+\.html)"[\s\S]*?<\/li>/g;
    let match;
    while ((match = itemRe.exec(html)) !== null) {
        const rawTitle = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        const url = match[2];
        // Extract Craigslist post ID from URL path (numeric segment before .html)
        const idMatch = url.match(/\/(\d+)\.html$/);
        const postId = idMatch ? idMatch[1] : Buffer.from(url).toString('base64').slice(0, 20);
        results.push({ title: rawTitle, url, postId });
    }
    return results;
}

function extractPost({ title, url, postId }) {
    return {
        id: `craigslist:${postId}`,
        source: 'craigslist',
        title,
        body: '',
        url,
        author: null,
        createdAt: new Date().toISOString(),
        createdUtc: Math.floor(Date.now() / 1000),
    };
}

function createStats() {
    return {
        fetched: 0,
        evaluated: 0,
        skippedSeen: 0,
        bodyFetches: 0,
        matches: 0,
        borderline: 0,
        rejects: 0,
        relayed: 0,
    };
}

export async function pollCraigslist({ mode = 'live' } = {}) {
    const modeFlags = runModeFlags(mode);
    const matches = [];
    const stats = createStats();
    const seenThisRun = new Set(); // dedup within this run across section+keyword permutations
    let bodyFetchesThisRun = 0;

    for (const section of CRAIGSLIST_SECTIONS) {
        for (const keyword of CRAIGSLIST_QUERY_KEYWORDS) {
            let html;
            try {
                html = await fetchSearchPage(section, keyword);
            } catch (err) {
                if (err.status === 403) {
                    console.warn(`[craigslist] 403 on ${section.label}/${keyword} — skipping section.`);
                    break;
                }
                console.warn(`[craigslist] Skipping ${section.label}/${keyword}: ${err.message}`);
                continue;
            }

            const results = parseResultsFromHtml(html);
            stats.fetched += results.length;
            console.log(`[craigslist] ${section.label}/${keyword}: found ${results.length} listing(s)`);

            for (const result of results) {
                const post = extractPost(result);

                if (seenThisRun.has(post.id)) continue;
                seenThisRun.add(post.id);

                if (isSeen(post.id)) {
                    stats.skippedSeen += 1;
                    continue;
                }

                if (isCraigslistListingNoise(post)) {
                    stats.rejects += 1;
                    if (modeFlags.shouldPersistSeen) {
                        markSeen(post.id);
                    }
                    continue;
                }

                stats.evaluated += 1;

                // Title-only preliminary classification. For buyer-intent sections (gigs)
                // or when the title is borderline, fetch the full listing body to give the
                // classifier richer text before making a final verdict.
                let titleClassification = classifyLeadCandidate({ title: post.title, body: '' });
                const shouldEnrichBody = (
                    bodyFetchesThisRun < CRAIGSLIST_BODY_FETCH_LIMIT
                    && (section.buyerIntent || titleClassification.verdict === 'borderline')
                    && titleClassification.verdict !== 'reject'
                );

                if (shouldEnrichBody) {
                    const body = await fetchListingBody(post.url);
                    if (body) {
                        // Reject property-listing bodies even if the title was promising.
                        if (isPropertyListingBody(body)) {
                            stats.rejects += 1;
                            if (modeFlags.shouldPersistSeen) markSeen(post.id);
                            continue;
                        }
                        post.body = body;
                        titleClassification = classifyLeadCandidate({ title: post.title, body });
                    }
                    bodyFetchesThisRun += 1;
                    stats.bodyFetches += 1;
                    // Small delay after individual listing fetches to stay polite.
                    await new Promise((resolve) => setTimeout(resolve, 400));
                }

                const classification = titleClassification;
                const softScore = scoreLeadCandidate(classification);

                if (classification.verdict === 'borderline') {
                    stats.borderline += 1;
                    logReviewCandidate({
                        mode,
                        source: 'craigslist',
                        post,
                        classification,
                        reason: 'borderline',
                    });
                    if (softScore.score >= LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD) {
                        logNearMissCandidate({
                            mode,
                            source: 'craigslist',
                            post,
                            classification,
                            score: softScore,
                        });
                    }
                    if (modeFlags.shouldPersistSeen) {
                        markSeen(post.id);
                    }
                    continue;
                }

                if (classification.verdict !== 'match') {
                    stats.rejects += 1;
                    if (softScore.score >= LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD) {
                        logNearMissCandidate({
                            mode,
                            source: 'craigslist',
                            post,
                            classification,
                            score: softScore,
                        });
                    }
                    continue;
                }

                stats.matches += 1;
                console.log(`[craigslist] Match in ${section.label}: "${post.title}" — ${post.url}`);

                if (!modeFlags.shouldRelay) {
                    logReviewCandidate({
                        mode,
                        source: 'craigslist',
                        post,
                        classification,
                        reason: mode === 'dry-run' ? 'dry-run-match' : 'review-only-match',
                    });
                    if (modeFlags.shouldPersistSeen) {
                        markSeen(post.id);
                    }
                    matches.push(post);
                    continue;
                }

                markSeen(post.id);

                const payload = buildLeadPayload(post);
                await relay(payload);
                stats.relayed += 1;
                matches.push(post);
            }

            // Polite delay between Craigslist search requests
            await new Promise((resolve) => setTimeout(resolve, CRAIGSLIST_REQUEST_DELAY_MS));
        }
    }

    return { matches, stats };
}

// Allow running directly: node src/craigslist.js
if (process.argv[1] && process.argv[1].endsWith('craigslist.js')) {
    const mode = resolveRunMode();
    pollCraigslist({ mode })
        .then((result) => console.log(`[craigslist] Done. ${result.matches.length} new match(es).`))
        .catch((err) => {
            console.error('[craigslist] Fatal:', err);
            process.exitCode = 1;
        });
}
