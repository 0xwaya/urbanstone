import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keywords that suggest someone needs countertop work
export const MATCH_KEYWORDS = [
    'countertop',
    'counter top',
    'countertops',
    'counter tops',
    'granite countertop',
    'quartz countertop',
    'quartzite countertop',
    'stone countertop',
    'countertop install',
    'countertop installation',
    'countertop replacement',
    'countertop repair',
    'granite repair',
    'countertop installer',
    'countertop fabricator',
    'fabrication',
    'need countertops',
    'need counter tops',
    'looking for countertops',
    'looking for granite',
    'looking for quartz',
    'recommend countertop installer',
    'quote for countertops',
    'estimate for countertops',
    'slab',
    'stone fabricator',
    'vanity top',
    'backsplash',
];

export const PROJECT_CONTEXT_KEYWORDS = [
    'kitchen remodel',
    'kitchen renovation',
    'bathroom remodel',
    'bathroom renovation',
    'bath remodel',
    'bath renovation',
    'kitchen redo',
    'kitchen update',
];

export const INTENT_KEYWORDS = [
    'hire',
    'quote',
    'estimate',
    'pricing',
    'price',
    'contractor',
    'installer',
    'fabricator',
    'install',
    'installation',
    'replace',
    'replacement',
    'repair',
    'professional',
    'service',
];

export const MATERIAL_SIGNAL_KEYWORDS = [
    'countertop',
    'counter top',
    'countertops',
    'counter tops',
    'granite',
    'quartz',
    'quartzite',
    'backsplash',
    'vanity top',
    'stone',
    'slab',
];

export const EXCLUDE_KEYWORDS = [
    'caulking',
    'grout',
    'paint kit',
    'banquette',
    'do i really need an oven',
    'speed oven',
    'shower tub',
    'inspiration board',
];

// Subreddits with Cincinnati-area focus or home improvement relevance
export const REDDIT_SUBREDDITS = [
    'cincinnati',
    'HomeImprovement',
    'KitchenRemodel',
    'homeowners',
    'FirstTimeHomeBuyer',
    'Remodel',
    'DIY',
];

function compactLocations(locations) {
    return [...new Set(
        locations
            .map((value) => String(value || '').trim())
            .filter(Boolean),
    )];
}

function extractQuotedStrings(text) {
    return [...text.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function loadCitiesFromServiceAreaMetadata() {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const metadataPath = path.resolve(__dirname, '..', '..', 'frontend', 'data', 'service-areas.js');

    try {
        const fileText = fs.readFileSync(metadataPath, 'utf8');
        const cities = [];

        for (const line of fileText.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('city:')) {
                cities.push(...extractQuotedStrings(trimmed));
            }
            if (trimmed.startsWith('nearbyAreas:')) {
                cities.push(...extractQuotedStrings(trimmed));
            }
            if (trimmed.startsWith('relatedAreas:')) {
                cities.push(...extractQuotedStrings(trimmed));
            }
        }

        return compactLocations(cities);
    } catch {
        return [];
    }
}

const metadataCities = loadCitiesFromServiceAreaMetadata();

// Keep the core market explicit while still inheriting broader metadata-driven areas.
const priorityCities = [
    'Cincinnati',
    'Mason',
    'West Chester',
    'Liberty Township',
    'Fairfield',
    'Hamilton',
    'Blue Ash',
    'Loveland',
    'Milford',
    'Anderson Township',
    'Covington',
    'Newport',
    'Florence',
    'Erlanger',
    'Ludlow',
    'Dayton',
];

export const GEO_TARGET_CITIES = compactLocations([...priorityCities, ...metadataCities]);

export const BASE_LEAD_QUERIES = [
    'countertop',
    'countertops',
    'granite',
    'quartz',
    'quartzite',
    'granite countertop',
    'quartz countertop',
    'quartzite countertop',
    'granite countertops',
    'quartz countertops',
    'quartzite countertops',
    'kitchen remodel',
    'bathroom remodel',
    'countertop installer',
    'countertop quote',
    'countertop replacement',
    'granite repair',
    'vanity top',
];

const GEO_QUERY_SUFFIXES = [
    'countertop',
    'countertops',
    'granite countertops',
    'quartz countertops',
    'quartzite countertops',
    'countertop installer',
    'kitchen remodel',
    'bathroom remodel',
];

export const GEO_AWARE_QUERIES = compactLocations(
    GEO_TARGET_CITIES.flatMap((city) => GEO_QUERY_SUFFIXES.map((suffix) => `${city} ${suffix}`)),
);

const CRAIGSLIST_QUERY_LIMIT = Number(process.env.LEAD_SOURCER_CRAIGSLIST_QUERY_LIMIT || 120);

export const CRAIGSLIST_QUERY_KEYWORDS = compactLocations([
    ...BASE_LEAD_QUERIES,
    ...GEO_AWARE_QUERIES,
]).slice(0, CRAIGSLIST_QUERY_LIMIT);

export const REDDIT_SEARCH_SUBREDDITS = ['cincinnati'];

const REDDIT_SEARCH_QUERY_LIMIT = Number(process.env.LEAD_SOURCER_REDDIT_SEARCH_QUERY_LIMIT || 12);

export const REDDIT_SEARCH_QUERIES = compactLocations([
    ...BASE_LEAD_QUERIES,
    ...GEO_AWARE_QUERIES,
]).slice(0, REDDIT_SEARCH_QUERY_LIMIT);

export const REDDIT_SEARCH_DELAY_MS = Number(process.env.LEAD_SOURCER_REDDIT_SEARCH_DELAY_MS || 900);

function firstNonEmptyEnv(...keys) {
    for (const key of keys) {
        const value = String(process.env[key] || '').trim();
        if (value) return value;
    }
    return '';
}

function envFlag(name, defaultValue = true) {
    const raw = String(process.env[name] || '').trim().toLowerCase();
    if (!raw) return defaultValue;
    return !['0', 'false', 'no', 'off'].includes(raw);
}

export const APIFY_NEXTDOOR_TASK_ID = firstNonEmptyEnv(
    'APIFY_NEXTDOOR_TASK_ID',
    'APIFY_TASK_ID_NEXTDOOR',
    'APIFY_NEXTDOOR_ID',
    'NEXTDOOR_TASK_ID',
);
export const APIFY_FACEBOOK_TASK_ID = firstNonEmptyEnv(
    'APIFY_FACEBOOK_TASK_ID',
    'APIFY_FACEBOOK_GROUPS_TASK_ID',
    'APIFY_TASK_ID_FACEBOOK',
    'FACEBOOK_TASK_ID',
);
export const APIFY_AD_LIBRARY_TASK_ID = firstNonEmptyEnv(
    'APIFY_AD_LIBRARY_TASK_ID',
    'APIFY_FACEBOOK_AD_LIBRARY_TASK_ID',
    'APIFY_TASK_ID_AD_LIBRARY',
    'AD_LIBRARY_TASK_ID',
);
export const APIFY_DATASET_LIMIT = Number(process.env.APIFY_DATASET_LIMIT || 200);
export const APIFY_ENABLE_NEXTDOOR = envFlag('APIFY_ENABLE_NEXTDOOR', true);
export const APIFY_ENABLE_FACEBOOK = envFlag('APIFY_ENABLE_FACEBOOK', true);
export const APIFY_ENABLE_AD_LIBRARY = envFlag('APIFY_ENABLE_AD_LIBRARY', true);
export const APIFY_TASK_TIMEOUT_MS = Number(process.env.APIFY_TASK_TIMEOUT_MS || 120000);
export const APIFY_TASK_DELAY_MS = Number(process.env.APIFY_TASK_DELAY_MS || 1200);

// Craigslist Cincinnati area base URL
export const CRAIGSLIST_BASE = 'https://cincinnati.craigslist.org';

// Craigslist sections most likely to contain relevant posts
export const CRAIGSLIST_SECTIONS = [
    { path: '/search/hss', label: 'household services' },
    { path: '/search/hsg', label: 'housing' },
    { path: '/search/rea', label: 'real estate' },
];

// How far back (in hours) to consider a post as new
export const MAX_POST_AGE_HOURS = 48;
