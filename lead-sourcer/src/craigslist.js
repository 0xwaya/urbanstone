/**
 * Craigslist HTML search poller.
 * Craigslist's RSS endpoint returns 403; the static HTML search page is accessible.
 * Parses cl-static-search-result items directly from the no-JS HTML.
 */
import { CRAIGSLIST_BASE, CRAIGSLIST_SECTIONS } from './config.js';
import { buildLeadPayload, classifyLeadCandidate } from './matcher.js';
import { isSeen, markSeen } from './dedup.js';
import { relay } from './relay.js';
import { CRAIGSLIST_QUERY_KEYWORDS } from './config.js';
import { runModeFlags } from './mode.js';
import { logReviewCandidate } from './review-log.js';

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};

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

export async function pollCraigslist({ mode = 'live' } = {}) {
    const modeFlags = runModeFlags(mode);
    const matches = [];
    const seenThisRun = new Set(); // dedup within this run across section+keyword permutations

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
            console.log(`[craigslist] ${section.label}/${keyword}: found ${results.length} listing(s)`);

            for (const result of results) {
                const post = extractPost(result);

                if (seenThisRun.has(post.id)) continue;
                seenThisRun.add(post.id);

                if (isSeen(post.id)) continue;
                const classification = classifyLeadCandidate({ title: post.title, body: post.body });

                if (classification.verdict === 'borderline') {
                    logReviewCandidate({
                        mode,
                        source: 'craigslist',
                        post,
                        classification,
                        reason: 'borderline',
                    });
                    if (modeFlags.shouldPersistSeen) {
                        markSeen(post.id);
                    }
                    continue;
                }

                if (classification.verdict !== 'match') continue;

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
                matches.push(post);
            }

            // Polite delay between Craigslist requests
            await new Promise((resolve) => setTimeout(resolve, 1200));
        }
    }

    return matches;
}

// Allow running directly: node src/craigslist.js
if (process.argv[1] && process.argv[1].endsWith('craigslist.js')) {
    pollCraigslist()
        .then((matches) => console.log(`[craigslist] Done. ${matches.length} new match(es).`))
        .catch((err) => {
            console.error('[craigslist] Fatal:', err);
            process.exitCode = 1;
        });
}
