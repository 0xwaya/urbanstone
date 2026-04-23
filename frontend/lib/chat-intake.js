import { curatedSlabOptions } from '../data/curated-slab-options';
import { serviceAreas } from '../data/service-areas';

const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})/i;
const PHONE_PATTERN = /(\+?1?\s*(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]*\d{4})/;
const SQFT_PATTERN = /(\d{2,5}(?:\.\d+)?)\s*(?:sq\s*ft|square\s*feet|sf)\b/i;

const CITY_NAMES = Array.from(new Set(serviceAreas.map((area) => area.city))).sort((a, b) => b.length - a.length);
const MATERIAL_OPTIONS = curatedSlabOptions.flatMap((group) =>
    group.options.map((option) => ({
        group: group.group,
        label: option.label,
        supplier: option.supplier,
        value: option.value,
        normalizedLabel: option.label.toLowerCase(),
        normalizedValue: option.value.toLowerCase(),
    }))
);

const REQUIRED_FIELDS = [
    'name',
    'email',
    'phone',
    'customerSegment',
    'city',
    'projectType',
    'projectPhase',
    'projectStatus',
    'tentativeBudget',
    'material',
    'squareFootage',
    'timeline',
];
const RATE_BY_MATERIAL_GROUP = {
    quartz: { low: 55, high: 75 },
    granite: { low: 60, high: 85 },
    quartzite: { low: 75, high: 110 },
    marble: { low: 80, high: 120 },
};

function normalizeText(value) {
    return String(value || '').toLowerCase();
}

function compact(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function isLikelyName(value) {
    return /^[a-zA-Z][a-zA-Z' -]{1,60}$/.test(String(value || '').trim());
}

function normalizeNameCase(value) {
    const compacted = compact(value);
    if (!compacted) {
        return '';
    }

    return compacted
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function detectProjectType(text) {
    const normalized = normalizeText(text);

    if (/(kitchen)/.test(normalized)) return 'kitchen';
    if (/(bath|bathroom|vanity)/.test(normalized)) return 'bath';
    if (/(bar|basement bar)/.test(normalized)) return 'bar';
    if (/(laundry)/.test(normalized)) return 'laundry';
    if (/(commercial|contractor|multi-unit|apartment|hotel|office)/.test(normalized)) return 'commercial';
    if (/(whole home|full remodel|entire home)/.test(normalized)) return 'whole-home';

    return '';
}

function detectCustomerSegment(text) {
    const normalized = normalizeText(text);

    if (/(builder|new construction|ground up|multi-unit|multifamily|developer|development|apartments|units)/.test(normalized)) {
        return 'builder-multi-unit';
    }
    if (/(flipper|flip|rehab|investment property|rental turn|turnover|investor)/.test(normalized)) {
        return 'contractor-flipper';
    }

    if (/(residential|homeowner|my home|kitchen|bath|vanity|house)/.test(normalized)) {
        return 'residential-custom';
    }

    return '';
}

function detectCity(text) {
    const normalized = normalizeText(text);
    const matched = CITY_NAMES.find((city) => normalized.includes(city.toLowerCase()));
    return matched || '';
}

function detectMaterial(text) {
    const normalized = normalizeText(text);
    const slab = MATERIAL_OPTIONS.find(
        (option) => normalized.includes(option.normalizedLabel) || normalized.includes(option.normalizedValue)
    );

    if (slab) {
        return {
            material: slab.label,
            materialGroup: slab.group,
            supplier: slab.supplier,
        };
    }

    if (normalized.includes('quartzite')) return { material: 'Quartzite', materialGroup: 'Quartzite', supplier: '' };
    if (normalized.includes('granite')) return { material: 'Granite', materialGroup: 'Granite', supplier: '' };
    if (normalized.includes('quartz')) return { material: 'Quartz', materialGroup: 'Quartz', supplier: '' };
    if (normalized.includes('marble')) return { material: 'Marble', materialGroup: 'Marble', supplier: '' };

    return { material: '', materialGroup: '', supplier: '' };
}

function detectTimeline(text) {
    const normalized = normalizeText(text);

    if (/(asap|as soon as possible|urgent|rush)/.test(normalized)) return 'asap';
    if (/(this week|1 week|one week|next week)/.test(normalized)) return '1-2 weeks';
    if (/(2 weeks|two weeks)/.test(normalized)) return 'about 2 weeks';
    if (/(month|4 weeks|30 days)/.test(normalized)) return 'about 1 month';

    const dateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (dateMatch) {
        return `target date ${dateMatch[1]}`;
    }

    return '';
}

function detectProjectPhase(text) {
    const normalized = normalizeText(text);

    if (/(planning|design|quote stage|shopping)/.test(normalized)) return 'planning';
    if (/(demo|demolition|tear out|tear-out)/.test(normalized)) return 'demo';
    if (/(cabinet|cabinets installed|ready for template|templating)/.test(normalized)) return 'template-ready';
    if (/(install week|install scheduled|ready to install)/.test(normalized)) return 'install-window';

    return '';
}

function detectProjectStatus(text) {
    const normalized = normalizeText(text);

    if (/(occupied|living there|in use)/.test(normalized)) return 'occupied';
    if (/(vacant|empty|unoccupied)/.test(normalized)) return 'vacant';
    if (/(tenant|renter|rental occupied)/.test(normalized)) return 'tenant-occupied';
    if (/(owner occupied|owner-occupied)/.test(normalized)) return 'owner-occupied';

    return '';
}

function detectTentativeBudget(text) {
    const normalized = compact(text);
    const rangeMatch = normalized.match(/\$\s?(\d[\d,]{2,})\s*(?:-|to)\s*\$\s?(\d[\d,]{2,})/i);
    if (rangeMatch) {
        const low = Number.parseInt(rangeMatch[1].replace(/[^\d]/g, ''), 10);
        const high = Number.parseInt(rangeMatch[2].replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(low) && Number.isFinite(high) && Math.min(low, high) >= 1000) {
            return `$${Math.min(low, high).toLocaleString()}-$${Math.max(low, high).toLocaleString()}`;
        }
    }

    const singleMatch = normalized.match(/\$\s?(\d{1,3}(?:,\d{3})*|\d{4,6})\b/);
    if (singleMatch) {
        const value = Number.parseInt(singleMatch[1].replace(/,/g, ''), 10);
        if (Number.isFinite(value) && value >= 1000) {
            return `$${value.toLocaleString()} target`;
        }
    }

    return '';
}

function detectName(text) {
    const explicit = text.match(/\b(?:my name is|name is)\s+([a-zA-Z][a-zA-Z' -]{1,60})/i);
    if (explicit && isLikelyName(explicit[1])) {
        return normalizeNameCase(explicit[1]);
    }

    const signed = text.match(/\bthis is\s+([a-zA-Z][a-zA-Z' -]{1,60})/i);
    if (signed && isLikelyName(signed[1])) {
        return normalizeNameCase(signed[1]);
    }

    return '';
}

function assistantAskedForName(history = []) {
    const recentAssistant = history
        .filter((entry) => entry?.role === 'assistant')
        .map((entry) => normalizeText(entry.content))
        .slice(-2);

    return recentAssistant.some((content) =>
        content.includes('what is your full name')
        || content.includes('full name')
    );
}

function detectPromptedPlainName(message, history = []) {
    if (!assistantAskedForName(history)) {
        return '';
    }

    const candidate = compact(message);
    if (!isLikelyName(candidate)) {
        return '';
    }

    const words = candidate.split(' ').filter(Boolean);
    if (words.length < 2 || words.length > 4) {
        return '';
    }

    const disallowedTokens = new Set([
        'echo', 'line', 'test', 'hello', 'hi', 'hey', 'countertops', 'kitchen', 'bath', 'quote', 'estimate', 'pricing',
    ]);

    const hasDisallowedToken = words.some((word) => disallowedTokens.has(word.toLowerCase()));
    if (hasDisallowedToken) {
        return '';
    }

    return normalizeNameCase(candidate);
}

function hasIntakeIntent(text) {
    const normalized = normalizeText(text);
    return /(estimate|quote|price|pricing|how much|budget|cost)/.test(normalized);
}

function hasActiveIntakeSession(history = []) {
    const recentAssistant = history
        .filter((entry) => entry?.role === 'assistant')
        .map((entry) => normalizeText(entry.content))
        .slice(-4);

    return recentAssistant.some((content) =>
        content.includes('estimate intake')
        || content.includes('reply with "send it"')
        || content.includes('route this')
    );
}

export function shouldStartEstimateIntake(message, history = []) {
    const normalized = normalizeText(message);
    if (hasIntakeIntent(normalized)) {
        return true;
    }

    const recentUserCombined = history
        .filter((entry) => entry?.role === 'user')
        .map((entry) => normalizeText(entry.content))
        .slice(-3)
        .join(' ');

    if (!hasActiveIntakeSession(history)) {
        return false;
    }

    if (/(send|submit|confirm|update|change|continue|estimate|quote)/.test(normalized)) {
        return true;
    }

    return hasIntakeIntent(recentUserCombined);
}

export function shouldSubmitIntake(message) {
    const normalized = normalizeText(message).trim();
    return /^(yes[, ]*)?(send|submit)( it| this| estimate| request)?$/.test(normalized)
        || /\b(send it|send estimate|submit estimate|submit request|go ahead and send)\b/.test(normalized);
}

export function detectGreetingIntent(message) {
    const normalized = normalizeText(message).trim();
    if (!normalized) {
        return false;
    }

    return /^(hi|hello|hey|good morning|good afternoon|good evening|yo|howdy)([!., ]|$)/.test(normalized);
}

export function buildSeasonalWeatherNote(now = new Date()) {
    const month = now.getUTCMonth() + 1;

    if (month >= 3 && month <= 5) {
        return 'Spring weather can shift quickly, so we usually plan install windows with a little buffer.';
    }
    if (month >= 6 && month <= 8) {
        return 'Summer schedules fill quickly, so early templating keeps install timing predictable.';
    }
    if (month >= 9 && month <= 11) {
        return 'Fall is busy for remodels, so locking material direction early helps keep momentum.';
    }

    return 'Winter access and timing can shift week to week, so we coordinate install windows carefully.';
}

export function extractEstimateIntake(message, history = []) {
    const userMessages = [...history, { role: 'user', content: message }]
        .filter((entry) => entry?.role === 'user')
        .map((entry) => compact(entry.content));

    const merged = userMessages.join(' \n ');

    const email = merged.match(EMAIL_PATTERN)?.[1]?.toLowerCase() || '';
    const phone = merged.match(PHONE_PATTERN)?.[1]?.trim() || '';
    const squareFootageRaw = merged.match(SQFT_PATTERN)?.[1] || '';
    const squareFootage = squareFootageRaw ? Number.parseFloat(squareFootageRaw) : null;

    const detectedName = detectName(merged) || detectPromptedPlainName(message, history);
    const intake = {
        name: detectedName,
        email,
        phone,
        customerSegment: detectCustomerSegment(merged),
        city: detectCity(merged),
        projectType: detectProjectType(merged),
        projectPhase: detectProjectPhase(merged),
        projectStatus: detectProjectStatus(merged),
        tentativeBudget: detectTentativeBudget(merged),
        squareFootage: Number.isFinite(squareFootage) ? squareFootage : null,
        timeline: detectTimeline(merged),
        notes: compact(
            userMessages
                .slice(-4)
                .join(' ')
                .slice(0, 800)
        ),
        ...detectMaterial(merged),
    };

    return intake;
}

export function getMissingEstimateFields(intake) {
    const baselineMissing = REQUIRED_FIELDS.filter((field) => {
        if (field === 'squareFootage') {
            return !intake.squareFootage;
        }
        return !compact(intake[field]);
    });

    if (intake.customerSegment !== 'builder-multi-unit') {
        return baselineMissing.filter((field) => field !== 'numberOfUnits' && field !== 'unitsPerWeek');
    }

    return baselineMissing;
}

export function getNextEstimateQuestion(missingFields) {
    const next = missingFields[0];

    switch (next) {
    case 'name':
        return 'What is your full name?';
    case 'email':
        return 'What is the best email for your estimate follow-up?';
    case 'phone':
        return 'What is the best phone number for scheduling?';
    case 'customerSegment':
        return 'Which project lane best fits: residential custom, home flip/contractor, or builder/new construction multi-unit?';
    case 'city':
        return 'What city is the project in?';
    case 'projectType':
        return 'Is this for a kitchen, bath, bar, laundry, whole-home, or commercial project?';
    case 'projectPhase':
        return 'What phase are you in right now: planning, demo, template-ready, or install window?';
    case 'projectStatus':
        return 'Is the property occupied, vacant, tenant-occupied, or owner-occupied?';
    case 'tentativeBudget':
        return 'What is your tentative countertop budget range?';
    case 'material':
        return 'Do you already have a material/slab direction (for example Calacatta Laza, Kodiak, Taj Mahal, quartz, granite, or quartzite)?';
    case 'squareFootage':
        return 'What is your rough square footage (sq ft)?';
    case 'timeline':
        return 'What is your target timeline (ASAP, 1-2 weeks, around a month, or a target date)?';
    default:
        return 'Share any additional project notes and I will route this for estimate follow-up.';
    }
}

export function buildEstimateSummary(intake) {
    return [
        `Name: ${intake.name}`,
        `Email: ${intake.email}`,
        `Phone: ${intake.phone}`,
        `Segment: ${intake.customerSegment}`,
        `City: ${intake.city}`,
        `Project type: ${intake.projectType}`,
        `Phase: ${intake.projectPhase}`,
        `Status: ${intake.projectStatus}`,
        `Budget: ${intake.tentativeBudget}`,
        `Material: ${intake.material}${intake.supplier ? ` (${intake.supplier})` : ''}`,
        `Rough sqft: ${intake.squareFootage}`,
        `Timeline: ${intake.timeline}`,
    ].join('\n');
}

export function getLiveEstimateRange(intake) {
    const sqft = Number(intake.squareFootage);
    if (!Number.isFinite(sqft) || sqft <= 0) {
        return null;
    }

    const materialKey = normalizeText(intake.materialGroup || intake.material);
    const selected = RATE_BY_MATERIAL_GROUP[materialKey];
    if (!selected) {
        return null;
    }

    const low = Math.round(selected.low * sqft);
    const high = Math.round(selected.high * sqft);

    return {
        low,
        high,
        unitRateLow: selected.low,
        unitRateHigh: selected.high,
    };
}
