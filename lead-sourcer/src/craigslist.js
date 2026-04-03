/**
 * Craigslist RSS poller — no auth required.
 * Searches Cincinnati sections for posts matching lead keywords.
 */
import { XMLParser } from 'fast-xml-parser';
import { CRAIGSLIST_BASE, CRAIGSLIST_SECTIONS, MAX_POST_AGE_HOURS } from './config.js';
import { matchesKeywords, isRecent, buildLeadPayload } from './matcher.js';
import { isSeen, markSeen } from './dedup.js';
import { relay } from './relay.js';

const parser = new XMLParser({ ignoreAttributes: false });

async function fetchRssFeed(section, keyword) {
    const encoded = encodeURIComponent(keyword);
    const url = `${CRAIGSLIST_BASE}${section.path}?format=rss&query=${encoded}&sort=date`;

    const response = await fetch(url, {
        headers: { 'User-Agent': 'UrbanStoneLeadSourcer/1.0 (contact sales@urbanstone.co)' },
    });

    if (!response.ok) {
        throw new Error(`Craigslist fetch failed (${section.label}/${keyword}): ${response.status}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item;
    if (!items) return [];
    return Array.isArray(items) ? items : [items];
}

function extractPost(item) {
    const dateStr = item.pubDate || item['dc:date'] || null;
    const createdAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
    const createdUtc = dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const link = item.link || item.guid || '';
    const id = `craigslist:${Buffer.from(link).toString('base64').slice(0, 32)}`;

    return {
        id,
        source: 'craigslist',
        title: item.title || '',
        body: item.description || '',
        url: link,
        author: null,
        createdAt,
        createdUtc,
    };
}

// Representative keyword probes — just enough to find relevant posts without spamming CL
const PROBE_KEYWORDS = ['countertop', 'granite', 'quartz', 'kitchen remodel', 'bathroom remodel'];

export async function pollCraigslist() {
    const matches = [];
    const seen = new Set(); // dedup within this run across section+keyword permutations

    for (const section of CRAIGSLIST_SECTIONS) {
        for (const keyword of PROBE_KEYWORDS) {
            let items;
            try {
                items = await fetchRssFeed(section, keyword);
            } catch (err) {
                console.warn(`[craigslist] Skipping ${section.label}/${keyword}: ${err.message}`);
                continue;
            }

            for (const item of items) {
                const post = extractPost(item);

                if (seen.has(post.id)) continue;
                seen.add(post.id);

                if (!isRecent(post.createdUtc, MAX_POST_AGE_HOURS)) continue;
                if (isSeen(post.id)) continue;
                if (!matchesKeywords(post.title) && !matchesKeywords(post.body)) continue;

                console.log(`[craigslist] Match in ${section.label}: "${post.title}" — ${post.url}`);
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
