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
