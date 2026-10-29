import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
for (const envPath of [
    path.resolve(configDirectory, '..', '.env.local'),
    path.resolve(configDirectory, '..', '.env'),
    path.resolve(configDirectory, '..', '..', '.vercel', '.env.production.local'),
]) {
    dotenv.config({ path: envPath, override: false });
}

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
    'kitchen project',
    'kitchen upgrade',
    'bathroom remodel',
    'bathroom renovation',
    'bath remodel',
    'bath renovation',
    'kitchen redo',
    'kitchen update',
    'home remodel',
    'home renovation',
    'remodel',
    'renovation',
];

export const INTENT_KEYWORDS = [
    'hire',
    'quote',
    'quotes',
    'estimate',
    'estimates',
    'cost',
    'costs',
    'budget',
    'pricing',
    'price',
    'contractor',
    'installer',
    'fabricator',
    'recommend',
    'recommendation',
    'recommendations',
    'referral',
    'referrals',
    'bid',
    'bids',
    'install',
    'installation',
    'replace',
    'replacement',
    'repair',
    'professional',
    'service',
    'looking',
    'looking for',
    'thinking about',
    'considering',
    'planning',
    'exploring',
    'comparing',
    'shopping for',
    'interested in',
    'help with',
    'help',
    'advice',
    'who installs',
    'who does',
    'any recommendations',
    'can you recommend',
    'recommendation for',
    'looking for someone',
    'looking for a contractor',
    'need a contractor',
    'any contractors',
    'any good contractors',
    'who did your',
    'who installed',
    'suggestions for',
    'need help finding',
    'planning to',
    'thinking of',
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

// Source-specific suppression terms to reduce obvious non-buying noise.
export const REDDIT_NON_BUYING_KEYWORDS = [
    'lawsuit',
    'sue',
    'legal advice',
    'attorney',
    'small claims',
    'insurance claim',
    'diy only',
    'self level compound',
    'tool recommendation',
    'permit question',
    'code violation',
    'landlord',
    'tenant',
    'apartment maintenance',
    'oil tank',
    'furnace repair',
    'hvac',
    'electrical panel',
];

export const CRAIGSLIST_LISTING_NOISE_KEYWORDS = [
    'for rent',
    'room for rent',
    'apartment',
    'condo for sale',
    'open house',
    'realtor',
    'mls',
    'lease',
    'property management',
    'investment property',
    'tenant occupied',
    'financing available',
    'move in ready',
    'newly remodeled unit',
    'hotel',
    'airbnb',
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
// Enable to relay all matching leads, including those already seen before (repeats).
// Useful for testing or when you want fresh reports without deduplication.
export const LEAD_SOURCER_SKIP_DEDUP = envFlag('LEAD_SOURCER_SKIP_DEDUP', false);


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
    'countertop fabricator',
    'stone fabricator',
];

const APIFY_FACEBOOK_QUERY_SUFFIXES = [
    'granite countertops',
    'quartz countertops',
    'quartzite countertops',
    'countertop installer',
    'countertop quote',
    'kitchen remodel',
    'bathroom remodel',
    'stone fabricator',
];

export const APIFY_FACEBOOK_NEIGHBORHOOD_QUERIES = compactLocations(
    GEO_TARGET_CITIES.flatMap((city) => APIFY_FACEBOOK_QUERY_SUFFIXES.map((suffix) => `${city} ${suffix}`)),
).slice(0, 80);

export const APIFY_POST_LOCATION_HINTS = GEO_TARGET_CITIES.map((city) => city.toLowerCase());

const GEO_QUERY_SUFFIXES = [
    'countertop installer',
    'countertop quote',
    'countertop replacement',
    'kitchen remodel',
    'bathroom remodel',
];

export const GEO_AWARE_QUERIES = compactLocations(
    GEO_TARGET_CITIES.flatMap((city) => GEO_QUERY_SUFFIXES.map((suffix) => `${city} ${suffix}`)),
);

const DEFAULT_CRAIGSLIST_PRIORITY_CITIES = ['Cincinnati', 'Mason', 'West Chester', 'Blue Ash', 'Covington'];
const CRAIGSLIST_PRIORITY_CITIES = compactLocations(
    String(process.env.LEAD_SOURCER_CRAIGSLIST_PRIORITY_CITIES || DEFAULT_CRAIGSLIST_PRIORITY_CITIES.join(','))
        .split(','),
);
const CRAIGSLIST_DIRECT_QUERIES = [
    'countertop',
    'granite countertop',
    'quartz countertop',
    'quartzite countertop',
    'countertop installer',
    'countertop quote',
    'countertop replacement',
    'stone fabricator',
    'kitchen remodel',
    'bathroom remodel',
];
const CRAIGSLIST_QUERY_LIMIT = Number(process.env.LEAD_SOURCER_CRAIGSLIST_QUERY_LIMIT || 40);

export const CRAIGSLIST_QUERY_KEYWORDS = compactLocations([
    ...CRAIGSLIST_DIRECT_QUERIES,
    ...CRAIGSLIST_PRIORITY_CITIES.flatMap((city) => GEO_QUERY_SUFFIXES.map((suffix) => `${city} ${suffix}`)),
]).slice(0, CRAIGSLIST_QUERY_LIMIT);

export const REDDIT_SEARCH_SUBREDDITS = [
    'cincinnati',
    'homeowners',
    'KitchenRemodel',
    'HomeImprovement',
    'DIY',
    'FirstTimeHomeBuyer',
];

const REDDIT_SEARCH_QUERY_LIMIT = Number(process.env.LEAD_SOURCER_REDDIT_SEARCH_QUERY_LIMIT || 20);

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
export const APIFY_ENABLE_AD_LIBRARY = envFlag('APIFY_ENABLE_AD_LIBRARY', false);
export const APIFY_OVERRIDE_TASK_INPUT = envFlag('APIFY_OVERRIDE_TASK_INPUT', false);
export const APIFY_TASK_TIMEOUT_MS = Number(process.env.APIFY_TASK_TIMEOUT_MS || 120000);
export const APIFY_TASK_DELAY_MS = Number(process.env.APIFY_TASK_DELAY_MS || 1200);

// --- Facebook Marketplace (curious_coder/facebook-marketplace, logged out) ---
// Off by default. Two Apify tasks: the main search task and a separate canary task
// ("kitchen cabinets") whose only job is to prove that logged-out search still returns
// results. Cookies are never configured; the poller refuses to run a task that has them.
export const APIFY_FB_MARKETPLACE_TASK_ID = firstNonEmptyEnv(
    'APIFY_FB_MARKETPLACE_TASK_ID',
    'APIFY_FACEBOOK_MARKETPLACE_TASK_ID',
);
export const APIFY_FB_MARKETPLACE_CANARY_TASK_ID = firstNonEmptyEnv(
    'APIFY_FB_MARKETPLACE_CANARY_TASK_ID',
    'APIFY_FACEBOOK_MARKETPLACE_CANARY_TASK_ID',
);
export const APIFY_ENABLE_FB_MARKETPLACE = envFlag('APIFY_ENABLE_FB_MARKETPLACE', false);
// Per-run spend caps (Apify run option maxTotalChargeUsd for pay-per-event actors).
// Main: 7 searches x 30 listings x $0.0015 (basic $0.0005 + details $0.001) = $0.315 -> cap $0.50.
// Canary: 1 search x 20 listings x $0.0005 (no details) = $0.01 -> cap $0.05.
export const APIFY_FB_MARKETPLACE_MAX_CHARGE_USD = Number(process.env.APIFY_FB_MARKETPLACE_MAX_CHARGE_USD || 0.5);
export const APIFY_FB_MARKETPLACE_CANARY_MAX_CHARGE_USD = Number(process.env.APIFY_FB_MARKETPLACE_CANARY_MAX_CHARGE_USD || 0.05);
// Run option maxItems (dataset items) — belt and braces next to the USD cap.
export const APIFY_FB_MARKETPLACE_MAX_ITEMS = Number(process.env.APIFY_FB_MARKETPLACE_MAX_ITEMS || 210);
export const APIFY_FB_MARKETPLACE_CANARY_MAX_ITEMS = Number(process.env.APIFY_FB_MARKETPLACE_CANARY_MAX_ITEMS || 20);
export const APIFY_FB_MARKETPLACE_CANARY_MIN_RESULTS = Number(process.env.APIFY_FB_MARKETPLACE_CANARY_MIN_RESULTS || 5);
// Detail scraping is slower than the 120s default used for the other Apify tasks.
export const APIFY_FB_MARKETPLACE_TIMEOUT_MS = Number(process.env.APIFY_FB_MARKETPLACE_TIMEOUT_MS || 600000);
// Marketplace leads are never relayed (email/webhook) while this is true, even in live mode.
export const APIFY_FB_MARKETPLACE_REVIEW_ONLY = envFlag('APIFY_FB_MARKETPLACE_REVIEW_ONLY', true);

// Logged-out Marketplace search ignores radius, so listings are kept only when the
// listing's reverse-geocoded city/state is in this list. Override with
// LEAD_SOURCER_FB_MARKETPLACE_ALLOWED_CITIES="Cincinnati, OH; Mason, OH; ...".
const DEFAULT_FB_MARKETPLACE_ALLOWED_CITIES = [
    // Ohio — Hamilton County
    'Cincinnati, OH', 'Norwood, OH', 'Reading, OH', 'Blue Ash, OH', 'Montgomery, OH', 'Sharonville, OH',
    'Springdale, OH', 'Forest Park, OH', 'Cheviot, OH', 'Kenwood, OH', 'Madeira, OH', 'Mariemont, OH',
    'Anderson Township, OH', 'Deer Park, OH', 'Wyoming, OH', 'Evendale, OH', 'Indian Hill, OH',
    'Terrace Park, OH', 'Silverton, OH', 'Amberley, OH', 'Golf Manor, OH', 'St. Bernard, OH',
    'Elmwood Place, OH', 'Lockland, OH', 'Arlington Heights, OH', 'Glendale, OH', 'Woodlawn, OH',
    'Lincoln Heights, OH', 'Mount Healthy, OH', 'North College Hill, OH', 'Greenhills, OH', 'Fairfax, OH',
    'Newtown, OH', 'Harrison, OH', 'North Bend, OH', 'Cleves, OH', 'Addyston, OH', 'Colerain Township, OH',
    'Green Township, OH', 'Delhi Township, OH', 'Springfield Township, OH', 'Sycamore Township, OH',
    'Symmes Township, OH', 'White Oak, OH', 'Monfort Heights, OH', 'Dent, OH', 'Mack, OH', 'Bridgetown, OH',
    // Ohio — Butler / Warren / Clermont
    'Mason, OH', 'West Chester, OH', 'West Chester Township, OH', 'Liberty Township, OH', 'Fairfield, OH',
    'Hamilton, OH', 'Monroe, OH', 'Middletown, OH', 'Trenton, OH', 'Lebanon, OH', 'Loveland, OH',
    'Maineville, OH', 'South Lebanon, OH', 'Morrow, OH', 'Springboro, OH', 'Milford, OH', 'Miami Township, OH',
    'Batavia, OH', 'Amelia, OH', 'Union Township, OH', 'Goshen, OH', 'Owensville, OH', 'Bethel, OH',
    'New Richmond, OH', 'Mount Orab, OH',
    // Northern Kentucky
    'Florence, KY', 'Covington, KY', 'Newport, KY', 'Fort Thomas, KY', 'Fort Mitchell, KY', 'Fort Wright, KY',
    'Erlanger, KY', 'Elsmere, KY', 'Independence, KY', 'Union, KY', 'Burlington, KY', 'Hebron, KY',
    'Alexandria, KY', 'Highland Heights, KY', 'Cold Spring, KY', 'Bellevue, KY', 'Dayton, KY', 'Edgewood, KY',
    'Villa Hills, KY', 'Crestview Hills, KY', 'Lakeside Park, KY', 'Taylor Mill, KY', 'Park Hills, KY',
    'Ludlow, KY', 'Wilder, KY', 'Southgate, KY', 'Walton, KY',
    // Southeast Indiana
    'Lawrenceburg, IN', 'Greendale, IN', 'Aurora, IN', 'Bright, IN',
];
export const FB_MARKETPLACE_ALLOWED_CITIES = compactLocations(
    String(process.env.LEAD_SOURCER_FB_MARKETPLACE_ALLOWED_CITIES || DEFAULT_FB_MARKETPLACE_ALLOWED_CITIES.join(';'))
        .split(';'),
);

// Marketplace selling-vs-buying rules (used by classifyMarketplaceListing).
// Matching is whole-word on normalized text (lowercase, punctuation -> spaces).
export const FB_MARKETPLACE_WANTED_KEYWORDS = [
    'iso', 'in search of', 'wtb', 'want to buy', 'wanted', 'looking for', 'seeking',
    'need someone', 'need somebody', 'need installed', 'needs installed', 'need installation',
    'need countertops', 'need countertop', 'need new countertops', 'need a countertop',
    'who can install', 'anyone install', 'anyone know someone', 'recommendations for', 'recommend a',
];
export const FB_MARKETPLACE_REMODEL_KEYWORDS = [
    'old countertops', 'old countertop', 'old counters', 'old cabinets',
    'removed during remodel', 'removed during kitchen remodel', 'removed from kitchen', 'removed from our kitchen',
    'countertops removed', 'counters removed', 'cabinets removed',
    'tearing out', 'tear out', 'tore out', 'ripped out', 'ripping out', 'pulled out of', 'came out of',
    'kitchen demo', 'demoed', 'remodeling our kitchen', 'remodeling kitchen', 'redoing our kitchen',
    'redoing kitchen', 'updating our kitchen', 'getting new countertops', 'new countertops going in',
    'replacing our countertops', 'replacing countertops', 'kitchen remodel', 'bathroom remodel',
];
export const FB_MARKETPLACE_SELLING_KEYWORDS = [
    'for sale', 'obo', 'or best offer', 'best offer', 'pickup only', 'pick up only', 'must pick up',
    'local pickup', 'brand new', 'new in box', 'in box', 'never used', 'never installed', 'unopened',
    'asking', 'firm', 'cash only', 'price is firm', 'like new', 'retail', 'msrp', 'sold as is', 'as is',
    'still available', 'first come', 'make an offer', 'paid',
];
export const FB_MARKETPLACE_DEALER_KEYWORDS = [
    'we install', 'we fabricate', 'we offer', 'free estimate', 'free estimates', 'free quote', 'free quotes',
    'fabrication shop', 'fabricator', 'fabrication', 'showroom', 'licensed and insured', 'fully insured',
    'remnant yard', 'remnants available', 'remnant sale', 'slabs available', 'slab yard', 'wholesale',
    'warehouse', 'in stock now', 'financing available', 'starting at', 'per square foot', 'per sq ft',
    'sq ft installed', 'installation included', 'installed price', 'visit our', 'call or text', 'our company',
    'llc', 'serving cincinnati', 'serving the', 'years of experience', 'contractor pricing',
];
export const LEAD_SOURCER_REQUIRE_REGIONAL_SIGNAL = envFlag('LEAD_SOURCER_REQUIRE_REGIONAL_SIGNAL', true);
export const LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD = Number(process.env.LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD || 45);
export const LEAD_SOURCER_RELAY_BORDERLINE = envFlag('LEAD_SOURCER_RELAY_BORDERLINE', true);
export const LEAD_SOURCER_BORDERLINE_RELAY_MIN_SCORE = Number(process.env.LEAD_SOURCER_BORDERLINE_RELAY_MIN_SCORE || 35);

// Craigslist Cincinnati area base URL
export const CRAIGSLIST_BASE = 'https://cincinnati.craigslist.org';

// Craigslist sections to search.
//
// Section guide:
//   hss  household services  — service providers advertising. Occasionally homeowners
//                              post "looking for someone to install" here too.
//   ggg  gigs (general)      — project-based work requests posted by homeowners; highest
//                              buyer-intent section. "Need granite countertop installed."
//   lbg  labor gigs          — secondary gigs section; smaller volume but same buyer intent.
//
// Excluded sections (previously searched, removed for yield quality):
//   hsg  housing             — rental/property listings. Mentions granite as a feature
//                              ("granite countertops in kitchen") not as a service request.
//   rea  real estate         — same as hsg; property sale listings with amenity lists.
//
const CRAIGSLIST_INCLUDE_HOUSEHOLD_SERVICES = envFlag('LEAD_SOURCER_CRAIGSLIST_INCLUDE_HOUSEHOLD_SERVICES', false);

export const CRAIGSLIST_SECTIONS = [
    { path: '/search/ggg', label: 'gigs', buyerIntent: true },
    { path: '/search/lbg', label: 'labor gigs', buyerIntent: true },
    ...(CRAIGSLIST_INCLUDE_HOUSEHOLD_SERVICES
        ? [{ path: '/search/hss', label: 'household services', buyerIntent: false }]
        : []),
];

// Max number of Craigslist listing bodies to fetch per run to enrich borderline titles.
export const CRAIGSLIST_BODY_FETCH_LIMIT = Number(process.env.LEAD_SOURCER_CRAIGSLIST_BODY_FETCH_LIMIT || 25);

// Delay between individual Craigslist search requests (ms).
export const CRAIGSLIST_REQUEST_DELAY_MS = Number(process.env.LEAD_SOURCER_CRAIGSLIST_REQUEST_DELAY_MS || 800);

// How far back (in hours) to consider a post as new
export const MAX_POST_AGE_HOURS = 48;
