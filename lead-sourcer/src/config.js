// Keywords that suggest someone needs countertop work
export const MATCH_KEYWORDS = [
    'countertop',
    'countertops',
    'granite countertop',
    'quartz countertop',
    'quartzite countertop',
    'kitchen remodel',
    'bathroom remodel',
    'kitchen renovation',
    'bathroom renovation',
    'fabrication',
    'countertop install',
    'need a contractor',
    'looking for contractor',
    'recommend a contractor',
    'slab',
    'stone fabricator',
];

// Subreddits with Cincinnati-area focus or home improvement relevance
export const REDDIT_SUBREDDITS = [
    'cincinnati',
    'CincinnatiSocial',
    'HomeImprovement',
    'KitchenRemodel',
    'DIY',
    'Renovation',
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
