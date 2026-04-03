/**
 * Reddit poller — uses Reddit's public JSON API (no auth required).
 * Monitors configured subreddits for posts matching lead keywords.
 */
import { REDDIT_SUBREDDITS, MAX_POST_AGE_HOURS } from './config.js';
import { buildLeadPayload, classifyLeadCandidate, isRecent } from './matcher.js';
import { isSeen, markSeen } from './dedup.js';
import { relay } from './relay.js';
import { REDDIT_SEARCH_DELAY_MS, REDDIT_SEARCH_QUERIES, REDDIT_SEARCH_SUBREDDITS } from './config.js';
import { runModeFlags } from './mode.js';
import { logReviewCandidate } from './review-log.js';

const REDDIT_API_BASE = 'https://www.reddit.com';
const USER_AGENT = 'UrbanStoneLeadSourcer/1.0 (lead monitoring; contact sales@urbanstone.co)';

async function fetchSubredditNew(subreddit) {
    const url = `${REDDIT_API_BASE}/r/${subreddit}/new.json?limit=25`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Reddit fetch failed for r/${subreddit}: ${response.status}`);
    }

    const data = await response.json();
    return (data?.data?.children || []).map((child) => child.data);
}

async function fetchSubredditSearch(subreddit, query) {
    const params = new URLSearchParams({
        q: query,
        restrict_sr: '1',
        sort: 'new',
        t: 'month',
        limit: '25',
    });

    const url = `${REDDIT_API_BASE}/r/${subreddit}/search.json?${params.toString()}`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Reddit search failed for r/${subreddit} (${query}): ${response.status}`);
    }

    const data = await response.json();
    return (data?.data?.children || []).map((child) => child.data);
}

function extractPost(post) {
    return {
        id: `reddit:${post.id}`,
        source: 'reddit',
        title: post.title || '',
        body: post.selftext || '',
        url: `https://www.reddit.com${post.permalink}`,
        author: post.author || 'unknown',
        subreddit: post.subreddit,
        createdAt: new Date(post.created_utc * 1000).toISOString(),
        createdUtc: post.created_utc,
    };
}

export async function pollReddit({ mode = 'live' } = {}) {
    const modeFlags = runModeFlags(mode);
    const matches = [];

    for (const subreddit of REDDIT_SUBREDDITS) {
        let posts;
        try {
            posts = await fetchSubredditNew(subreddit);
        } catch (err) {
            console.warn(`[reddit] Skipping r/${subreddit}: ${err.message}`);
            continue;
        }

        const postMap = new Map(posts.map((post) => [post.id, post]));
        if (REDDIT_SEARCH_SUBREDDITS.includes(subreddit)) {
            for (const query of REDDIT_SEARCH_QUERIES) {
                try {
                    const searchPosts = await fetchSubredditSearch(subreddit, query);
                    for (const searchPost of searchPosts) {
                        postMap.set(searchPost.id, searchPost);
                    }
                } catch (err) {
                    console.warn(`[reddit] Search skip r/${subreddit} (${query}): ${err.message}`);
                }
                await new Promise((resolve) => setTimeout(resolve, REDDIT_SEARCH_DELAY_MS));
            }
        }

        posts = [...postMap.values()];

        console.log(`[reddit] r/${subreddit}: fetched ${posts.length} post(s)`);

        for (const raw of posts) {
            const post = extractPost(raw);

            if (!isRecent(raw.created_utc, MAX_POST_AGE_HOURS)) { continue; }
            if (isSeen(post.id)) { continue; }
            const classification = classifyLeadCandidate({ title: post.title, body: post.body });

            if (classification.verdict === 'borderline') {
                logReviewCandidate({
                    mode,
                    source: 'reddit',
                    post,
                    classification,
                    reason: 'borderline',
                });
                if (modeFlags.shouldPersistSeen) {
                    markSeen(post.id);
                }
                continue;
            }

            if (classification.verdict !== 'match') { continue; }

            console.log(`[reddit] Match in r/${subreddit}: "${post.title}" — ${post.url}`);

            if (!modeFlags.shouldRelay) {
                logReviewCandidate({
                    mode,
                    source: 'reddit',
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

        // Brief pause between subreddit requests to be a polite API client
        await new Promise((resolve) => setTimeout(resolve, 800));
    }

    return matches;
}

// Allow running directly: node src/reddit.js
if (process.argv[1] && process.argv[1].endsWith('reddit.js')) {
    pollReddit()
        .then((matches) => console.log(`[reddit] Done. ${matches.length} new match(es).`))
        .catch((err) => {
            console.error('[reddit] Fatal:', err);
            process.exitCode = 1;
        });
}
