import 'dotenv/config';
import { ApifyClient } from 'apify-client';
import {
    APIFY_AD_LIBRARY_TASK_ID,
    APIFY_DATASET_LIMIT,
    APIFY_ENABLE_AD_LIBRARY,
    APIFY_ENABLE_FACEBOOK,
    APIFY_ENABLE_NEXTDOOR,
    APIFY_OVERRIDE_TASK_INPUT,
    APIFY_FACEBOOK_TASK_ID,
    APIFY_NEXTDOOR_TASK_ID,
    APIFY_TASK_DELAY_MS,
    APIFY_TASK_TIMEOUT_MS,
    BASE_LEAD_QUERIES,
    GEO_TARGET_CITIES,
    APIFY_POST_LOCATION_HINTS,
    LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD,
    LEAD_SOURCER_RELAY_BORDERLINE,
    LEAD_SOURCER_BORDERLINE_RELAY_MIN_SCORE,
} from './config.js';
import { buildLeadPayload, classifyLeadCandidate, scoreLeadCandidate } from './matcher.js';
import { isSeen, markSeen } from './dedup.js';
import { relay } from './relay.js';
import { resolveRunMode } from './mode.js';
import { runModeFlags } from './mode.js';
import { logNearMissCandidate, logReviewCandidate } from './review-log.js';

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
        locations: GEO_TARGET_CITIES.slice(0, 12).map((city) => `${city}, OH`),
        proxyConfiguration: { useApifyProxy: true },
    };
}

function defaultFacebookInput() {
    return {
        resultsLimit: 120,
        startUrls: [],
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

function hasAnyKeyword(text, keywords) {
    const haystack = String(text || '').toLowerCase();
    return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function isApifyHighIntentCandidate(post) {
    const content = `${post.title}\n${post.body}`.toLowerCase();
    const locationHintPresent = hasAnyKeyword(content, APIFY_POST_LOCATION_HINTS);
    const countertopIntent = hasAnyKeyword(content, [
        'countertop',
        'counter tops',
        'granite',
        'quartz',
        'quartzite',
        'vanity top',
        'backsplash',
        'kitchen remodel',
        'bathroom remodel',
        'countertop installer',
        'quote',
        'estimate',
    ]);

    return locationHintPresent && countertopIntent;
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

function createStats() {
    return {
        fetched: 0,
        evaluated: 0,
        skippedSeen: 0,
        matches: 0,
        borderline: 0,
        rejects: 0,
        relayed: 0,
        byTask: {},
    };
}

function getTaskStats(stats, taskLabel) {
    if (!stats.byTask[taskLabel]) {
        stats.byTask[taskLabel] = {
            fetched: 0,
            evaluated: 0,
            skippedSeen: 0,
            matches: 0,
            borderline: 0,
            rejects: 0,
            relayed: 0,
        };
    }

    return stats.byTask[taskLabel];
}

async function runTask(client, { taskId, taskLabel, input }) {
    if (!taskId) return [];

    const run = input ? await client.task(taskId).call(input) : await client.task(taskId).call();
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

function extractTaskInput(taskMeta) {
    return taskMeta && typeof taskMeta.input === 'object' && taskMeta.input !== null
        ? taskMeta.input
        : {};
}

function warnOnSuspiciousTaskInput(taskLabel, taskMeta) {
    const taskInput = extractTaskInput(taskMeta);

    if (taskLabel === 'facebook-groups') {
        const startUrls = Array.isArray(taskInput.startUrls) ? taskInput.startUrls : [];
        const flattenedUrls = startUrls
            .map((entry) => (typeof entry === 'string' ? entry : entry?.url))
            .filter((value) => typeof value === 'string')
            .map((value) => value.toLowerCase());

        if (flattenedUrls.some((url) => url.includes('facebook.com/humansofnewyork'))) {
            console.warn('[apify] facebook-groups task appears misconfigured: startUrls contains humansofnewyork. Replace with local market pages/groups.');
        }

        if (flattenedUrls.length === 0 && !APIFY_OVERRIDE_TASK_INPUT) {
            console.warn('[apify] facebook-groups task has no startUrls configured in Apify task input. Configure startUrls in Apify console or set APIFY_OVERRIDE_TASK_INPUT=true with APIFY_FACEBOOK_TASK_INPUT.');
        }
    }

    if (taskLabel === 'nextdoor') {
        const locations = Array.isArray(taskInput.locations) ? taskInput.locations : [];
        if (locations.length === 0 && !APIFY_OVERRIDE_TASK_INPUT) {
            console.warn('[apify] nextdoor task has no locations configured in Apify task input. Add locations in Apify console or set APIFY_OVERRIDE_TASK_INPUT=true with APIFY_NEXTDOOR_TASK_INPUT.');
        }
    }
}

export async function pollApify({ mode = 'live' } = {}) {
    const stats = createStats();
    const token = String(process.env.APIFY_TOKEN || '').trim();
    if (!token) {
        console.log('[apify] APIFY_TOKEN not set; skipping Apify poll.');
        return { matches: [], stats };
    }

    if (!APIFY_NEXTDOOR_TASK_ID && !APIFY_FACEBOOK_TASK_ID && !APIFY_AD_LIBRARY_TASK_ID) {
        console.log('[apify] No Apify task IDs configured; skipping Apify poll. Expected one of: APIFY_NEXTDOOR_TASK_ID, APIFY_FACEBOOK_TASK_ID, APIFY_AD_LIBRARY_TASK_ID (or alias keys).');
        return { matches: [], stats };
    }

    console.log(`[apify] Task IDs loaded — nextdoor=${Boolean(APIFY_NEXTDOOR_TASK_ID)} facebook=${Boolean(APIFY_FACEBOOK_TASK_ID)} adLibrary=${Boolean(APIFY_AD_LIBRARY_TASK_ID)}`);
    console.log(`[apify] Source toggles — nextdoor=${APIFY_ENABLE_NEXTDOOR} facebook=${APIFY_ENABLE_FACEBOOK} adLibrary=${APIFY_ENABLE_AD_LIBRARY}`);

    const modeFlags = runModeFlags(mode);
    const client = new ApifyClient({ token });
    const matches = [];

    const nextdoorInput = parseJsonEnv('APIFY_NEXTDOOR_TASK_INPUT', defaultNextdoorInput());
    const facebookInput = parseJsonEnv('APIFY_FACEBOOK_TASK_INPUT', defaultFacebookInput());
    const adLibraryInput = parseJsonEnv('APIFY_AD_LIBRARY_TASK_INPUT', defaultAdLibraryInput());

    if (!APIFY_OVERRIDE_TASK_INPUT) {
        console.log('[apify] Using saved Apify task inputs (APIFY_OVERRIDE_TASK_INPUT=false).');
    }

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
        return { matches: [], stats };
    }

    const taskMetaById = new Map();
    await Promise.all(taskConfigs.map(async (task) => {
        try {
            const taskMeta = await client.task(task.taskId).get();
            taskMetaById.set(task.taskId, taskMeta);
            warnOnSuspiciousTaskInput(task.taskLabel, taskMeta);
        } catch (error) {
            console.warn(`[apify] ${task.taskLabel}: unable to inspect task metadata: ${error?.message || error}`);
        }
    }));

    const items = [];
    for (let i = 0; i < taskConfigs.length; i += 1) {
        const task = taskConfigs[i];
        try {
            const taskMeta = taskMetaById.get(task.taskId);
            const taskInput = APIFY_OVERRIDE_TASK_INPUT
                ? task.input
                : null;

            if (APIFY_OVERRIDE_TASK_INPUT && (!taskMeta || Object.keys(extractTaskInput(taskMeta)).length === 0)) {
                console.warn(`[apify] ${task.taskLabel}: task has no saved input; using APIFY_*_TASK_INPUT override.`);
            }

            const taskItems = await withTimeout(
                runTask(client, { ...task, input: taskInput }),
                APIFY_TASK_TIMEOUT_MS,
                task.taskLabel,
            );
            items.push(...taskItems);
            stats.fetched += taskItems.length;
            getTaskStats(stats, task.taskLabel).fetched += taskItems.length;
        } catch (reason) {
            logTaskFailure(task.taskLabel, reason);
        }

        if (i < taskConfigs.length - 1) {
            await delay(APIFY_TASK_DELAY_MS);
        }
    }

    for (const post of items) {
        const taskLabel = post.source.replace('apify-', '');
        const taskStats = getTaskStats(stats, taskLabel);

        if (isSeen(post.id)) {
            stats.skippedSeen += 1;
            taskStats.skippedSeen += 1;
            continue;
        }

        stats.evaluated += 1;
        taskStats.evaluated += 1;

        const classification = classifyLeadCandidate({
            title: post.title,
            body: post.body,
        });
        const softScore = scoreLeadCandidate(classification);

        if (!isApifyHighIntentCandidate(post)) {
            stats.rejects += 1;
            taskStats.rejects += 1;
            if (modeFlags.shouldPersistSeen) {
                markSeen(post.id);
            }
            continue;
        }

        if (classification.verdict === 'borderline') {
            stats.borderline += 1;
            taskStats.borderline += 1;
            logReviewCandidate({
                mode,
                source: post.source,
                post,
                classification,
                reason: 'borderline',
            });
            if (softScore.score >= LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD) {
                logNearMissCandidate({
                    mode,
                    source: post.source,
                    post,
                    classification,
                    score: softScore,
                });
            }

            const shouldRelayBorderline = modeFlags.shouldRelay
                && LEAD_SOURCER_RELAY_BORDERLINE
                && softScore.score >= LEAD_SOURCER_BORDERLINE_RELAY_MIN_SCORE;

            if (shouldRelayBorderline) {
                markSeen(post.id);
                const borderlinePayload = buildLeadPayload(
                    post,
                    { verdict: 'borderline', scoreResult: softScore },
                );
                await relay(borderlinePayload);
                stats.relayed += 1;
                taskStats.relayed += 1;
                matches.push(post);
                continue;
            }

            if (modeFlags.shouldPersistSeen) {
                markSeen(post.id);
            }
            continue;
        }

        if (classification.verdict !== 'match') {
            stats.rejects += 1;
            taskStats.rejects += 1;
            if (softScore.score >= LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD) {
                logNearMissCandidate({
                    mode,
                    source: post.source,
                    post,
                    classification,
                    score: softScore,
                });
            }
            continue;
        }

        stats.matches += 1;
        taskStats.matches += 1;
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
        const payload = buildLeadPayload(
            post,
            { verdict: 'match', scoreResult: softScore },
        );
        await relay(payload);
        stats.relayed += 1;
        taskStats.relayed += 1;
        matches.push(post);
    }

    return { matches, stats };
}

if (process.argv[1] && process.argv[1].endsWith('apify.js')) {
    const mode = resolveRunMode();
    pollApify({ mode })
        .then((result) => console.log(`[apify] Done. ${result.matches.length} new match(es).`))
        .catch((err) => {
            console.error('[apify] Fatal:', err);
            process.exitCode = 1;
        });
}