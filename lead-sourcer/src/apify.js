import { ApifyClient } from 'apify-client';
import {
    APIFY_AD_LIBRARY_TASK_ID,
    APIFY_DATASET_LIMIT,
    APIFY_ENABLE_AD_LIBRARY,
    APIFY_ENABLE_FACEBOOK,
    APIFY_ENABLE_NEXTDOOR,
    APIFY_ENABLE_FB_MARKETPLACE,
    APIFY_FB_MARKETPLACE_CANARY_MAX_CHARGE_USD,
    APIFY_FB_MARKETPLACE_CANARY_MAX_ITEMS,
    APIFY_FB_MARKETPLACE_CANARY_MIN_RESULTS,
    APIFY_FB_MARKETPLACE_CANARY_TASK_ID,
    APIFY_FB_MARKETPLACE_MAX_CHARGE_USD,
    APIFY_FB_MARKETPLACE_MAX_ITEMS,
    APIFY_FB_MARKETPLACE_REVIEW_ONLY,
    APIFY_FB_MARKETPLACE_TASK_ID,
    APIFY_FB_MARKETPLACE_TIMEOUT_MS,
    APIFY_OVERRIDE_TASK_INPUT,
    APIFY_FACEBOOK_TASK_ID,
    APIFY_NEXTDOOR_TASK_ID,
    APIFY_TASK_DELAY_MS,
    APIFY_TASK_TIMEOUT_MS,
    BASE_LEAD_QUERIES,
    GEO_TARGET_CITIES,
    APIFY_POST_LOCATION_HINTS,
    APIFY_FACEBOOK_NEIGHBORHOOD_QUERIES,
    LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD,
    LEAD_SOURCER_RELAY_BORDERLINE,
    LEAD_SOURCER_BORDERLINE_RELAY_MIN_SCORE,
    LEAD_SOURCER_SKIP_DEDUP,
    FB_MARKETPLACE_ALLOWED_CITIES,
} from './config.js';
import { buildLeadPayload, classifyLeadCandidate, scoreLeadCandidate } from './matcher.js';
import { classifyMarketplaceListing } from './core/classification.js';
import { isSeen, markSeen } from './dedup.js';
import { deliverLead } from './relay.js';
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

// --- Facebook Marketplace (curious_coder/facebook-marketplace output) -----------
// Field names from the actor's README sample: id, marketplace_listing_title,
// custom_title, listing_price{amount,formatted_amount,currency}, formatted_price.text,
// location.reverse_geocode{city,state}, location_text.text, redacted_description.text
// (details only), creation_time (epoch seconds, details only), story.url, is_sold,
// is_pending, is_live. The seller (marketplace_listing_seller / seller / story.actors)
// is deliberately NOT copied: it must never reach logs, email or the webhook.
export const FB_MARKETPLACE_SELLER_PLACEHOLDER = 'facebook-marketplace-seller';

function nested(obj, pathParts) {
    return pathParts.reduce((value, key) => (value == null ? undefined : value[key]), obj);
}

function nestedString(obj, ...paths) {
    for (const pathParts of paths) {
        const value = nested(obj, pathParts);
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }
    return '';
}

export function marketplaceLocationOf(item) {
    const city = nestedString(item, ['location', 'reverse_geocode', 'city']);
    const state = nestedString(item, ['location', 'reverse_geocode', 'state']);
    if (city) return { city, state, text: state ? `${city}, ${state}` : city };
    // Fallback: "City, ST" from location_text.text.
    const text = nestedString(item, ['location_text', 'text']);
    const [rawCity, rawState] = text.split(',').map((part) => part.trim());
    return { city: rawCity || '', state: rawState || '', text };
}

function marketplaceCreatedAt(item) {
    const raw = nested(item, ['creation_time']);
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds > 0) {
        const millis = String(Math.trunc(seconds)).length <= 10 ? seconds * 1000 : seconds;
        const parsed = new Date(millis);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return deriveTimestamp(item);
}

export function normalizeMarketplaceItem(item, taskLabel = 'facebook-marketplace') {
    const listingId = nestedString(item, ['id'], ['listing_id'], ['story', 'post_id']);
    const title = nestedString(item, ['marketplace_listing_title'], ['custom_title'], ['title']);
    const description = nestedString(item, ['redacted_description', 'text'], ['description'], ['story', 'message']);
    const priceAmount = nestedString(item, ['listing_price', 'amount']);
    const priceText = nestedString(item, ['listing_price', 'formatted_amount'], ['formatted_price', 'text']);
    const currency = nestedString(item, ['listing_price', 'currency']) || 'USD';
    const location = marketplaceLocationOf(item);
    const url = nestedString(item, ['listingUrl'], ['story', 'url'], ['url'])
        || (listingId ? `https://www.facebook.com/marketplace/item/${listingId}/` : '');
    const isSold = item?.is_sold === true;
    const isPending = item?.is_pending === true;

    const bodyParts = [
        description,
        priceText ? `Price: ${priceText}` : '',
        location.text ? `Location: ${location.text}` : '',
        isSold ? 'Status: sold' : (isPending ? 'Status: pending' : ''),
    ].filter(Boolean);

    return {
        id: `apify:${taskLabel}:${listingId || url || (title || '').slice(0, 120)}`,
        source: `apify-${taskLabel}`,
        title: title || (description ? description.slice(0, 180) : '(untitled listing)'),
        body: bodyParts.join('\n\n'),
        url: url || 'https://www.facebook.com/marketplace/',
        author: FB_MARKETPLACE_SELLER_PLACEHOLDER,
        createdAt: marketplaceCreatedAt(item),
        marketplace: {
            listingId,
            price: priceAmount === '' ? null : Number(priceAmount),
            priceText,
            currency,
            city: location.city,
            state: location.state,
            isSold,
            isPending,
            hasDetails: Boolean(description),
        },
    };
}

function cityKey(city, state) {
    const c = String(city || '').toLowerCase().replace(/^saint\s+/, 'st. ').replace(/^st\s+/, 'st. ').trim();
    const s = String(state || '').toUpperCase().trim();
    return `${c}|${s}`;
}

const STATE_NAMES = { OHIO: 'OH', KENTUCKY: 'KY', INDIANA: 'IN' };

export function buildAllowedCitySet(entries = FB_MARKETPLACE_ALLOWED_CITIES) {
    const set = new Set();
    for (const entry of entries) {
        const [city, state] = String(entry).split(',').map((part) => part.trim());
        if (city) set.add(cityKey(city, state));
    }
    return set;
}

/** Keep a listing only when its reverse-geocoded city+state is in the allowed list. */
export function isAllowedMarketplaceLocation(post, allowed = buildAllowedCitySet()) {
    const city = post?.marketplace?.city;
    if (!city) return false; // unknown location -> dropped (counted as droppedNoLocation)
    const rawState = String(post.marketplace.state || '').trim().toUpperCase();
    const state = STATE_NAMES[rawState] || rawState;
    return allowed.has(cityKey(city, state));
}

/**
 * Canary verdict: the run is unhealthy when the canary actor run did not succeed or
 * returned fewer than the minimum number of items. Never "0, ok".
 */
export function assessMarketplaceCanary({ runStatus, itemCount, minResults = APIFY_FB_MARKETPLACE_CANARY_MIN_RESULTS }) {
    if (runStatus !== 'SUCCEEDED') {
        return { healthy: false, reason: `canary run status ${runStatus || 'unknown'}` };
    }
    if (!Number.isFinite(itemCount) || itemCount < minResults) {
        return { healthy: false, reason: `canary returned ${itemCount} item(s) (< ${minResults}); logged-out search may be blocked` };
    }
    return { healthy: true, reason: `canary returned ${itemCount} item(s)` };
}

function defaultNextdoorInput() {
    return {
        locations: GEO_TARGET_CITIES.slice(0, 20).map((city) => `${city}, OH`),
        proxyConfiguration: { useApifyProxy: true },
    };
}

// Facebook Groups scraper actors expect actual group page URLs, not search query URLs.
// The operator MUST supply real Cincinnati-area home improvement / neighborhood group URLs
// via APIFY_FACEBOOK_TASK_INPUT. This default is a minimal safe placeholder that
// produces zero results but does not crash the run.
function defaultFacebookInput() {
    const explicitInput = String(process.env.APIFY_FACEBOOK_TASK_INPUT || '').trim();
    if (!explicitInput && String(process.env.APIFY_OVERRIDE_TASK_INPUT || '').trim().toLowerCase() !== 'false') {
        console.warn(
            '[apify] facebook-groups: APIFY_FACEBOOK_TASK_INPUT is not set. '
            + 'The Facebook Groups actor requires real group page URLs (e.g. https://www.facebook.com/groups/<ID>/). '
            + 'Set APIFY_FACEBOOK_TASK_INPUT to a JSON object with startUrls pointing to actual Cincinnati-area groups, '
            + 'or configure startUrls directly in the Apify task and set APIFY_OVERRIDE_TASK_INPUT=false.',
        );
    }
    return {
        resultsLimit: 50,
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
    // Apify tasks are already geo-targeted (Nextdoor neighborhoods, Facebook local groups)
    // so requiring a city name in the post text would silently reject all legitimate leads.
    // We only gate on keyword intent here; geo-filtering is handled at the task input level.
    return hasAnyKeyword(content, [
        'countertop',
        'counter tops',
        'countertops',
        'granite',
        'quartz',
        'quartzite',
        'vanity top',
        'backsplash',
        'kitchen remodel',
        'bathroom remodel',
        'countertop installer',
        'countertop quote',
        'countertop estimate',
        'stone fabricator',
        'quote',
        'estimate',
    ]);
}

function delay(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, label) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
    let timer;
    // Clear the timer when the task settles; otherwise a 10-minute Marketplace timeout
    // keeps the Node process (and the GitHub job) alive after the poll has finished.
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
    ]).finally(() => clearTimeout(timer));
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
        status: 'ok',
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

async function runTask(client, {
    taskId,
    taskLabel,
    input,
    runOptions,
    normalize,
    requireSucceeded = false,
    raw = false,
}) {
    if (!taskId) return [];

    // runOptions (maxTotalChargeUsd, maxItems, timeout) are Apify run options, not actor input.
    const run = runOptions
        ? await client.task(taskId).call(input || undefined, runOptions)
        : (input ? await client.task(taskId).call(input) : await client.task(taskId).call());
    if (requireSucceeded && run?.status !== 'SUCCEEDED') {
        throw new Error(`actor run ${run?.id || '?'} finished with status ${run?.status || 'unknown'}${run?.statusMessage ? ` (${run.statusMessage})` : ''}`);
    }
    if (run?.usageTotalUsd != null) {
        console.log(`[apify] ${taskLabel}: run usage $${Number(run.usageTotalUsd).toFixed(4)}`);
    }
    const datasetId = run?.defaultDatasetId;
    if (!datasetId) {
        if (requireSucceeded) throw new Error('actor run finished without a dataset id');
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
    if (raw) return { run, items };
    return items.map((item) => (normalize ? normalize(item, taskLabel) : normalizeItem(taskLabel, item)));
}

/** Refuse to run a Marketplace task whose saved input or override contains cookies. */
function marketplaceInputHasCookies(taskMeta, overrideInput) {
    const saved = extractTaskInput(taskMeta);
    const hasCookies = (input) => {
        const value = input?.cookies;
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
    };
    return hasCookies(saved) || hasCookies(overrideInput);
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

        // Warn regardless of override flag — bad startUrls will silently produce zero results.
        if (flattenedUrls.some((url) => url.includes('facebook.com/humansofnewyork'))) {
            console.warn('[apify] facebook-groups task appears misconfigured: startUrls contains humansofnewyork. Replace with actual Cincinnati-area group URLs.');
        }

        if (flattenedUrls.length === 0) {
            console.warn(
                '[apify] facebook-groups has no startUrls. '
                + 'Supply real group page URLs via APIFY_FACEBOOK_TASK_INPUT or configure them in the Apify task console.',
            );
        }
    }

    if (taskLabel === 'nextdoor') {
        const locations = Array.isArray(taskInput.locations) ? taskInput.locations : [];
        if (locations.length === 0) {
            console.warn(
                '[apify] nextdoor task has no locations. '
                + 'Set APIFY_NEXTDOOR_TASK_INPUT with a locations array, or configure them in the Apify task console.',
            );
        }
    }
}

export async function pollApify({ mode = 'live' } = {}) {
    const stats = createStats();
    const token = String(process.env.APIFY_TOKEN || '').trim();
    if (!token) {
        stats.status = 'disabled';
        console.log('[apify] APIFY_TOKEN not set; skipping Apify poll.');
        return { matches: [], stats };
    }

    if (!APIFY_NEXTDOOR_TASK_ID && !APIFY_FACEBOOK_TASK_ID && !APIFY_AD_LIBRARY_TASK_ID && !APIFY_FB_MARKETPLACE_TASK_ID) {
        stats.status = 'disabled';
        console.log('[apify] No Apify task IDs configured; skipping Apify poll. Expected one of: APIFY_NEXTDOOR_TASK_ID, APIFY_FACEBOOK_TASK_ID, APIFY_AD_LIBRARY_TASK_ID, APIFY_FB_MARKETPLACE_TASK_ID (or alias keys).');
        return { matches: [], stats };
    }

    console.log(`[apify] Task IDs loaded — nextdoor=${Boolean(APIFY_NEXTDOOR_TASK_ID)} facebook=${Boolean(APIFY_FACEBOOK_TASK_ID)} adLibrary=${Boolean(APIFY_AD_LIBRARY_TASK_ID)} fbMarketplace=${Boolean(APIFY_FB_MARKETPLACE_TASK_ID)} fbMarketplaceCanary=${Boolean(APIFY_FB_MARKETPLACE_CANARY_TASK_ID)}`);
    console.log(`[apify] Source toggles — nextdoor=${APIFY_ENABLE_NEXTDOOR} facebook=${APIFY_ENABLE_FACEBOOK} adLibrary=${APIFY_ENABLE_AD_LIBRARY} fbMarketplace=${APIFY_ENABLE_FB_MARKETPLACE}`);

    const modeFlags = runModeFlags(mode);
    const client = new ApifyClient({ token });
    const matches = [];

    const nextdoorInput = parseJsonEnv('APIFY_NEXTDOOR_TASK_INPUT', defaultNextdoorInput());
    const facebookInput = parseJsonEnv('APIFY_FACEBOOK_TASK_INPUT', defaultFacebookInput());
    const adLibraryInput = parseJsonEnv('APIFY_AD_LIBRARY_TASK_INPUT', defaultAdLibraryInput());
    // No built-in default: the reviewed input lives in the Apify task (drafts/fb-marketplace/apify-task-input.json).
    const fbMarketplaceInput = parseJsonEnv('APIFY_FB_MARKETPLACE_TASK_INPUT', null);

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
        {
            enabled: APIFY_ENABLE_FB_MARKETPLACE,
            taskId: APIFY_FB_MARKETPLACE_TASK_ID,
            taskLabel: 'facebook-marketplace',
            input: fbMarketplaceInput,
            marketplace: true,
            timeoutMs: APIFY_FB_MARKETPLACE_TIMEOUT_MS,
            normalize: normalizeMarketplaceItem,
            requireSucceeded: true,
            runOptions: {
                maxTotalChargeUsd: APIFY_FB_MARKETPLACE_MAX_CHARGE_USD,
                maxItems: APIFY_FB_MARKETPLACE_MAX_ITEMS,
                timeout: Math.max(60, Math.floor(APIFY_FB_MARKETPLACE_TIMEOUT_MS / 1000) - 30),
            },
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

    const unhealthy = (reason) => {
        stats.status = 'degraded';
        stats.unhealthyReasons = [...(stats.unhealthyReasons || []), reason];
        console.warn(`[apify] UNHEALTHY: ${reason}`);
    };

    const marketplaceTask = taskConfigs.find((task) => task.marketplace);
    if (marketplaceTask) {
        // Canary first: if logged-out search is blocked, skip the paid main run.
        if (!APIFY_FB_MARKETPLACE_CANARY_TASK_ID) {
            unhealthy('facebook-marketplace: APIFY_FB_MARKETPLACE_CANARY_TASK_ID not set; refusing to treat an unchecked run as healthy');
        } else {
            try {
                const { run, items: canaryItems } = await withTimeout(
                    runTask(client, {
                        taskId: APIFY_FB_MARKETPLACE_CANARY_TASK_ID,
                        taskLabel: 'facebook-marketplace-canary',
                        input: null,
                        raw: true,
                        runOptions: {
                            maxTotalChargeUsd: APIFY_FB_MARKETPLACE_CANARY_MAX_CHARGE_USD,
                            maxItems: APIFY_FB_MARKETPLACE_CANARY_MAX_ITEMS,
                            timeout: 240,
                        },
                    }),
                    300000,
                    'facebook-marketplace-canary',
                );
                const verdict = assessMarketplaceCanary({ runStatus: run?.status, itemCount: canaryItems.length });
                stats.canary = { status: run?.status || 'unknown', items: canaryItems.length, healthy: verdict.healthy };
                if (verdict.healthy) {
                    console.log(`[apify] facebook-marketplace canary ok: ${verdict.reason}`);
                } else {
                    unhealthy(`facebook-marketplace: ${verdict.reason}`);
                }
            } catch (error) {
                stats.canary = { status: 'error', items: 0, healthy: false };
                unhealthy(`facebook-marketplace: canary failed: ${error?.message || error}`);
            }
        }
        if (!stats.canary?.healthy) {
            marketplaceTask.skip = true;
            console.warn('[apify] facebook-marketplace: main search skipped because the canary is unhealthy.');
        }
    }

    const allowedCities = buildAllowedCitySet();
    const items = [];
    for (let i = 0; i < taskConfigs.length; i += 1) {
        const task = taskConfigs[i];
        if (task.skip) continue;
        try {
            const taskMeta = taskMetaById.get(task.taskId);
            const taskInput = APIFY_OVERRIDE_TASK_INPUT
                ? task.input
                : null;

            if (APIFY_OVERRIDE_TASK_INPUT && (!taskMeta || Object.keys(extractTaskInput(taskMeta)).length === 0)) {
                console.warn(`[apify] ${task.taskLabel}: task has no saved input; using APIFY_*_TASK_INPUT override.`);
            }

            if (task.marketplace && marketplaceInputHasCookies(taskMeta, taskInput)) {
                unhealthy('facebook-marketplace: task input contains cookies; refusing to run logged in');
                continue;
            }

            let taskItems = await withTimeout(
                runTask(client, { ...task, input: taskInput }),
                task.timeoutMs || APIFY_TASK_TIMEOUT_MS,
                task.taskLabel,
            );
            if (task.marketplace) {
                const before = taskItems.length;
                const noLocation = taskItems.filter((post) => !post.marketplace?.city).length;
                taskItems = taskItems.filter((post) => !post.marketplace?.isSold
                    && isAllowedMarketplaceLocation(post, allowedCities));
                const taskStats = getTaskStats(stats, task.taskLabel);
                taskStats.droppedOutOfArea = (taskStats.droppedOutOfArea || 0) + (before - taskItems.length - noLocation);
                taskStats.droppedNoLocation = (taskStats.droppedNoLocation || 0) + noLocation;
                console.log(`[apify] ${task.taskLabel}: kept ${taskItems.length}/${before} after Cincinnati-area/sold filter`);
            }
            items.push(...taskItems);
            stats.fetched += taskItems.length;
            getTaskStats(stats, task.taskLabel).fetched += taskItems.length;
        } catch (reason) {
            stats.status = 'degraded';
            logTaskFailure(task.taskLabel, reason);
        }

        if (i < taskConfigs.length - 1) {
            await delay(APIFY_TASK_DELAY_MS);
        }
    }

    for (const post of items) {
        const taskLabel = post.source.replace('apify-', '');
        const taskStats = getTaskStats(stats, taskLabel);

        if (!LEAD_SOURCER_SKIP_DEDUP && isSeen(post.id)) {
            stats.skippedSeen += 1;
            taskStats.skippedSeen += 1;
            continue;
        }
        stats.evaluated += 1;
        taskStats.evaluated += 1;

        if (post.source === 'apify-facebook-marketplace') {
            const mpClass = classifyMarketplaceListing({
                title: post.title,
                body: post.body,
                price: post.marketplace?.price,
            });
            const kind = mpClass.marketplace.kind;
            taskStats[`kind_${kind}`] = (taskStats[`kind_${kind}`] || 0) + 1;
            if (mpClass.verdict === 'reject') {
                stats.rejects += 1;
                taskStats.rejects += 1;
                if (modeFlags.shouldPersistSeen) markSeen(post.id);
                continue;
            }
            // Wanted posts are logged as review-only matches (the reply agent can draft a
            // manual Marketplace message); remodel sellers are logged for Edward only.
            const reviewOnly = APIFY_FB_MARKETPLACE_REVIEW_ONLY || !modeFlags.shouldRelay;
            if (mpClass.verdict === 'review' || reviewOnly) {
                if (mpClass.verdict === 'match') {
                    stats.matches += 1;
                    taskStats.matches += 1;
                } else {
                    stats.borderline += 1;
                    taskStats.borderline += 1;
                }
                logReviewCandidate({
                    mode,
                    source: post.source,
                    post,
                    classification: mpClass,
                    reason: mpClass.verdict === 'match'
                        ? (mode === 'dry-run' ? 'dry-run-match' : 'review-only-match')
                        : 'marketplace-remodel-signal',
                });
                if (modeFlags.shouldPersistSeen) markSeen(post.id);
                if (mpClass.verdict === 'match') matches.push(post);
                continue;
            }
            // Relayed only when APIFY_FB_MARKETPLACE_REVIEW_ONLY=false and mode=live.
            const mpPayload = buildLeadPayload(post, { verdict: 'match', scoreResult: scoreLeadCandidate(mpClass) });
            // Internal-only: email to sales@ (relay.js guard), never the webhook; no seller contact is included.
            mpPayload.metadata.internalOnly = true;
            if (!(await deliverLead(mpPayload, { postId: post.id, markSeen, stats }))) continue;
            stats.matches += 1;
            taskStats.matches += 1;
            stats.relayed += 1;
            taskStats.relayed += 1;
            matches.push(post);
            continue;
        }

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
                const borderlinePayload = buildLeadPayload(
                    post,
                    { verdict: 'borderline', scoreResult: softScore },
                );
                if (!(await deliverLead(borderlinePayload, { postId: post.id, markSeen, stats }))) continue;
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
        const payload = buildLeadPayload(
            post,
            { verdict: 'match', scoreResult: softScore },
        );
        if (!(await deliverLead(payload, { postId: post.id, markSeen, stats }))) continue;
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