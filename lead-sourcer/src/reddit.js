/**
 * Reddit poller — uses Reddit's public JSON API (no auth required).
 * Monitors configured subreddits for posts matching lead keywords.
 */
import { REDDIT_SUBREDDITS, MAX_POST_AGE_HOURS } from './config.js';
import { matchesKeywords, isRecent, buildLeadPayload } from './matcher.js';
import { isSeen, markSeen } from './dedup.js';
import { relay } from './relay.js';

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

export async function pollReddit() {
    const matches = [];

    for (const subreddit of REDDIT_SUBREDDITS) {
        let posts;
        try {
            posts = await fetchSubredditNew(subreddit);
        } catch (err) {
            console.warn(`[reddit] Skipping r/${subreddit}: ${err.message}`);
            continue;
        }

        for (const raw of posts) {
            const post = extractPost(raw);

            if (!isRecent(raw.created_utc, MAX_POST_AGE_HOURS)) continue;
            if (isSeen(post.id)) continue;
            if (!matchesKeywords(post.title) && !matchesKeywords(post.body)) continue;

            console.log(`[reddit] Match in r/${subreddit}: "${post.title}" — ${post.url}`);
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
