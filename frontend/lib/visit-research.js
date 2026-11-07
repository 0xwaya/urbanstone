import { serviceAreas } from '../data/service-areas';

const KNOWN_CITIES = new Set(serviceAreas.map((area) => String(area.city || '').toLowerCase()));

function clean(value, max = 300) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, max) : '';
}

function decodeHeader(value) {
    const text = clean(value, 80);
    if (!text) return '';
    try {
        return decodeURIComponent(text);
    } catch {
        return text;
    }
}

function inferIntent(path, referrer, utm) {
    const haystack = `${path} ${referrer} ${utm.source} ${utm.campaign}`.toLowerCase();
    if (/quote|estimate/.test(haystack)) return 'estimate';
    if (/contractor|builder/.test(haystack)) return 'contractor';
    if (/material|quartz|granite|quartzite|marble/.test(haystack)) return 'materials';
    if (/project/.test(haystack)) return 'projects';
    if (/service-area|coverage|cincinnati|kentucky/.test(haystack)) return 'service-area';
    if (utm.source) return 'campaign';
    return 'general';
}

/**
 * On-the-job research for a new site visit. Uses the page they opened,
 * campaign tags, and coarse city from the host (never an IP address).
 */
export function researchVisit({ headers = {}, visit = {} } = {}) {
    const city = decodeHeader(headers['x-vercel-ip-city']) || clean(visit.city, 80);
    const region = decodeHeader(headers['x-vercel-ip-country-region']) || clean(visit.region, 40);
    const country = decodeHeader(headers['x-vercel-ip-country']) || clean(visit.country, 8);
    const path = clean(visit.path, 300);
    const referrer = clean(visit.referrer, 400);
    const utm = {
        source: clean(visit.utmSource, 80),
        medium: clean(visit.utmMedium, 80),
        campaign: clean(visit.utmCampaign, 80),
    };
    const cityKey = city.toLowerCase();
    const inArea = city
        ? KNOWN_CITIES.has(cityKey) || /cincinnati|covington|newport|florence|reading/.test(cityKey)
        : null;
    const intent = inferIntent(path, referrer, utm);
    const serviceFit = inArea === true ? 'in-area' : inArea === false ? 'outside-list' : 'unknown';
    const lines = [
        'On-the-job visit research. Do not contact them unless they ask.',
        path ? `Landed on ${path}.` : 'Landing page was not reported.',
        city ? `Approximate area: ${[city, region, country].filter(Boolean).join(', ')}.` : 'City was not available.',
        serviceFit === 'in-area'
            ? 'That place is inside the published service list.'
            : serviceFit === 'outside-list'
                ? 'That place is outside the published list. Confirm before scheduling.'
                : 'Service fit stays unknown until they name a city.',
        `Intent read: ${intent}.`,
        referrer ? `Referrer: ${referrer}.` : 'No referrer (direct, or the browser hid it).',
        utm.source ? `Campaign: ${[utm.source, utm.medium, utm.campaign].filter(Boolean).join(' / ')}.` : '',
    ].filter(Boolean);

    return {
        researchedAt: new Date().toISOString(),
        path,
        referrer,
        utm,
        city,
        region,
        country,
        serviceFit,
        intent,
        summary: lines.join(' '),
    };
}
