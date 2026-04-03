import { ApifyClient } from 'apify-client';
import {
    APIFY_AD_LIBRARY_TASK_ID,
    APIFY_DATASET_LIMIT,
    APIFY_ENABLE_AD_LIBRARY,
    APIFY_ENABLE_FACEBOOK,
    APIFY_ENABLE_NEXTDOOR,
    APIFY_FACEBOOK_TASK_ID,
    APIFY_NEXTDOOR_TASK_ID,
    APIFY_TASK_DELAY_MS,
    APIFY_TASK_TIMEOUT_MS,
    BASE_LEAD_QUERIES,
    GEO_TARGET_CITIES,
} from './config.js';
import { buildLeadPayload, classifyLeadCandidate } from './matcher.js';
import { isSeen, markSeen } from './dedup.js';
import { relay } from './relay.js';
import { runModeFlags } from './mode.js';
import { logReviewCandidate } from './review-log.js';

function parseJsonEnv(name, fallback) {
    const raw = process.env[name];
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        console.warn(`[apify] Invalid JSON in ${name}; using fallback input.`);
        return fallback;
    }
}

function firstNonEmptyString(obj, keys) {
    for (const key of keys) {
        const value = obj?.[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
}

function buildStableItemId(taskLabel, item, url) {
    const rawId = firstNonEmptyString(item, ['id', 'postId', 'post_id', 'itemId', 'item_id']);
    const stablePart = rawId || url || JSON.stringify(item).slice(0, 160);
    return `apify:${taskLabel}:${stablePart}`;
}

function deriveTimestamp(item) {
    const raw = firstNonEmptyString(item, ['timestamp', 'createdAt', 'created_at', 'date', 'publishedAt', 'time']);
    if (!raw) return new Date().toISOString();

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && asNumber > 0) {
        const millis = String(raw).length <= 10 ? asNumber * 1000 : asNumber;
        const byEpoch = new Date(millis);
        if (!Number.isNaN(byEpoch.getTime())) return byEpoch.toISOString();
    }

    return new Date().toISOString();
}

function normalizeItem(taskLabel, item) {
    const text = [
        firstNonEmptyString(item, ['text', 'caption', 'message', 'body', 'content', 'description']),
        firstNonEmptyString(item, ['title', 'headline']),
    ].filter(Boolean).join('\n\n').trim();

    const title = firstNonEmptyString(item, ['title', 'headline']) || text.slice(0, 180);
    const url = firstNonEmptyString(item, ['postUrl', 'url', 'permalink', 'link']);
    const author = firstNonEmptyString(item, ['author', 'authorName', 'username', 'user']);
    const location = firstNonEmptyString(item, ['location', 'city', 'region']);
    const createdAt = deriveTimestamp(item);
    const id = buildStableItemId(taskLabel, item, url);

    const body = location ? `${text}\n\nLocation: ${location}` : text;

    return {
        id,
        source: `apify-${taskLabel}`,
        title: title || '(untitled post)',
        body,
        url: url || 'https://apify.com',
        author: author || 'unknown',
        createdAt,
    };
}

function defaultNextdoorInput() {
    return {
        location: 'Cincinnati, OH',
        neighborhoods: GEO_TARGET_CITIES.slice(0, 24),
        keywords: [
            'granite countertops',
            'quartz countertops',
            'quartzite countertops',
            'countertop installer',
            'kitchen remodel',
            'bathroom remodel',
        ],
        maxPosts: 80,
        proxyConfiguration: { useApifyProxy: true },
    };
}

function defaultFacebookInput() {
    return {
        maxPosts: 120,
        commentsLimit: 10,
        keywords: BASE_LEAD_QUERIES,
        proxyConfiguration: { useApifyProxy: true },
    };
}

function defaultAdLibraryInput() {
    return {
        maxItems: 120,
        keywords: BASE_LEAD_QUERIES,
        location: 'Cincinnati, OH',
        proxyConfiguration: { useApifyProxy: true },
    };
}

function delay(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, label) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
    ]);
}

function logTaskFailure(taskLabel, reason) {
    const message = reason?.message || String(reason || 'unknown error');
    const normalized = message.toLowerCase();
    if (normalized.includes('memory limit') || normalized.includes('exceed the memory limit')) {
        console.warn(`[apify] ${taskLabel}: skipped due to account memory limit. Disable this source via APIFY_ENABLE_${taskLabel.toUpperCase().replace(/-/g, '_')}=false or increase Apify capacity.`);
        return;
    }
    console.warn(`[apify] ${taskLabel}: task run failed: ${message}`);
}

async function runTask(client, { taskId, taskLabel, input }) {
    if (!taskId) return [];

    const run = await client.task(taskId).call(input);
    const datasetId = run?.defaultDatasetId;
    if (!datasetId) {
        console.warn(`[apify] ${taskLabel}: task completed without dataset id.`);
        return [];
    }

    const dataset = await client.dataset(datasetId).listItems({
        desc: true,
        clean: true,
        limit: APIFY_DATASET_LIMIT,
    });

    const items = Array.isArray(dataset?.items) ? dataset.items : [];
    console.log(`[apify] ${taskLabel}: fetched ${items.length} item(s)`);
    return items.map((item) => normalizeItem(taskLabel, item));
}

export async function pollApify({ mode = 'live' } = {}) {
    const token = String(process.env.APIFY_TOKEN || '').trim();
    if (!token) {
        console.log('[apify] APIFY_TOKEN not set; skipping Apify poll.');
        return [];
    }

    if (!APIFY_NEXTDOOR_TASK_ID && !APIFY_FACEBOOK_TASK_ID && !APIFY_AD_LIBRARY_TASK_ID) {
        console.log('[apify] No Apify task IDs configured; skipping Apify poll. Expected one of: APIFY_NEXTDOOR_TASK_ID, APIFY_FACEBOOK_TASK_ID, APIFY_AD_LIBRARY_TASK_ID (or alias keys).');
        return [];
    }

    console.log(`[apify] Task IDs loaded — nextdoor=${Boolean(APIFY_NEXTDOOR_TASK_ID)} facebook=${Boolean(APIFY_FACEBOOK_TASK_ID)} adLibrary=${Boolean(APIFY_AD_LIBRARY_TASK_ID)}`);
    console.log(`[apify] Source toggles — nextdoor=${APIFY_ENABLE_NEXTDOOR} facebook=${APIFY_ENABLE_FACEBOOK} adLibrary=${APIFY_ENABLE_AD_LIBRARY}`);

    const modeFlags = runModeFlags(mode);
    const client = new ApifyClient({ token });
    const matches = [];

    const nextdoorInput = parseJsonEnv('APIFY_NEXTDOOR_TASK_INPUT', defaultNextdoorInput());
    const facebookInput = parseJsonEnv('APIFY_FACEBOOK_TASK_INPUT', defaultFacebookInput());
    const adLibraryInput = parseJsonEnv('APIFY_AD_LIBRARY_TASK_INPUT', defaultAdLibraryInput());

    const taskConfigs = [
        {
            enabled: APIFY_ENABLE_NEXTDOOR,
            taskId: APIFY_NEXTDOOR_TASK_ID,
            taskLabel: 'nextdoor',
            input: nextdoorInput,
        },
        {
            enabled: APIFY_ENABLE_FACEBOOK,
            taskId: APIFY_FACEBOOK_TASK_ID,
            taskLabel: 'facebook-groups',
            input: facebookInput,
        },
        {
            enabled: APIFY_ENABLE_AD_LIBRARY,
            taskId: APIFY_AD_LIBRARY_TASK_ID,
            taskLabel: 'facebook-ad-library',
            input: adLibraryInput,
        },
    ].filter((task) => task.enabled && task.taskId);

    if (taskConfigs.length === 0) {
        console.log('[apify] No enabled Apify tasks with IDs found; skipping Apify poll.');
        return [];
    }

    const items = [];
    for (let i = 0; i < taskConfigs.length; i += 1) {
        const task = taskConfigs[i];
        try {
            const taskItems = await withTimeout(
                runTask(client, task),
                APIFY_TASK_TIMEOUT_MS,
                task.taskLabel,
            );
            items.push(...taskItems);
        } catch (reason) {
            logTaskFailure(task.taskLabel, reason);
        }

        if (i < taskConfigs.length - 1) {
            await delay(APIFY_TASK_DELAY_MS);
        }
    }

    for (const post of items) {
        if (isSeen(post.id)) continue;

        const classification = classifyLeadCandidate({
            title: post.title,
            body: post.body,
        });

        if (classification.verdict === 'borderline') {
            logReviewCandidate({
                mode,
                source: post.source,
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

        console.log(`[apify] Match in ${post.source}: "${post.title}" — ${post.url}`);

        if (!modeFlags.shouldRelay) {
            logReviewCandidate({
                mode,
                source: post.source,
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

    return matches;
}

if (process.argv[1] && process.argv[1].endsWith('apify.js')) {
    pollApify()
        .then((matches) => console.log(`[apify] Done. ${matches.length} new match(es).`))
        .catch((err) => {
            console.error('[apify] Fatal:', err);
            process.exitCode = 1;
        });
}