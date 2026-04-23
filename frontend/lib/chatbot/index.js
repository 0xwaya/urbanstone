import { homepageFaqItems } from '../../data/homepage-content';
import { materialPages } from '../../data/material-pages';
import { serviceAreas } from '../../data/service-areas';
import { chatbotPolicies } from '../../data/chatbot-knowledge';
import { curatedSlabOptions } from '../../data/curated-slab-options';
import supplierSummaries from '../../data/supplier-summaries.json';

const MAX_MATERIAL_PAGES = 30;
const MAX_SERVICE_AREAS = 30;
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'at', 'be', 'by', 'do', 'for', 'from', 'have', 'how', 'i', 'in', 'is', 'it', 'me', 'my',
    'of', 'on', 'or', 'our', 'the', 'to', 'we', 'what', 'who', 'with', 'you', 'your',
]);

function normalize(text) {
    return String(text || '').toLowerCase();
}

function tokenize(text) {
    return normalize(text)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function scoreEntry(tokens, entry, normalizedMessage) {
    const haystack = normalize(`${entry.title} ${entry.text} ${entry.tags.join(' ')}`);
    let score = 0;

    tokens.forEach((token) => {
        if (haystack.includes(token)) {
            score += 1;
        }

        if (new RegExp(`\\b${token}\\b`).test(haystack)) {
            score += 2;
        }
    });

    const normalizedTitle = normalize(entry.title);
    if (normalizedMessage.includes(normalizedTitle)) {
        score += 6;
    }

    entry.tags.forEach((tag) => {
        const normalizedTag = normalize(tag);
        if (normalizedTag.length > 2 && normalizedMessage.includes(normalizedTag)) {
            score += 3;
        }
    });

    return score;
}

function buildEntries() {
    const entries = [];

    entries.push({
        id: 'ops-workflow-core',
        title: 'Urban Stone operating workflow',
        text: 'Urban Stone workflow: shortlist slab direction, confirm on-site measurements and templating, finalize fabrication scope, then schedule install.',
        tags: ['workflow', 'estimate', 'timeline', 'install', 'templating', 'operations'],
    });

    entries.push({
        id: 'ops-owner-accountability',
        title: 'Urban Stone ownership and accountability',
        text: `${chatbotPolicies.owner}. ${chatbotPolicies.companyHistory}`,
        tags: ['owner', 'history', 'leadership', 'urban stone collective'],
    });

    entries.push({
        id: 'ops-service-policy',
        title: 'Service area confirmation policy',
        text: chatbotPolicies.serviceAreaPolicy,
        tags: ['service area', 'coverage', 'cincinnati', 'northern kentucky', 'policy'],
    });

    entries.push({
        id: 'ops-quote-policy',
        title: 'Provisional quote policy',
        text: chatbotPolicies.quotePolicy,
        tags: ['quote', 'pricing', 'provisional', 'templating', 'measurements', 'policy'],
    });

    (chatbotPolicies.materialHandlingPolicies || []).forEach((policy, index) => {
        entries.push({
            id: `ops-material-handling-${index}`,
            title: 'Material handling and supplier policy',
            text: policy,
            tags: [
                'slab hold',
                'supplier',
                'vein matching',
                'backsplash',
                'island',
                'material approval',
                'warehouse',
                'transfer',
                'policy',
            ],
        });
    });

    entries.push({
        id: 'ops-commercial-intake',
        title: 'Contractor and multi-unit intake',
        text: 'For contractor and multi-unit projects, we scope rollout cadence, material lane, and sequencing before final pricing direction.',
        tags: ['commercial', 'contractor', 'multi-unit', 'apartment', 'builder', 'pricing'],
    });

    entries.push({
        id: 'ops-flipper-intake',
        title: 'Home flipper and turnover intake',
        text: 'For flipper and turnover projects, we align slab lane and install sequencing to vacancy windows and resale timeline.',
        tags: ['flipper', 'flip', 'turnover', 'investor', 'rental', 'rehab'],
    });

    entries.push({
        id: 'ops-residential-intake',
        title: 'Residential custom intake',
        text: 'For residential custom projects, we guide slab selection, edge details, templating readiness, and installation path.',
        tags: ['residential', 'homeowner', 'kitchen remodel', 'bath remodel', 'custom'],
    });

    chatbotPolicies.liabilityNotes.forEach((note, index) => {
        entries.push({
            id: `policy-liability-${index}`,
            title: 'Natural stone and fabrication liability note',
            text: note,
            tags: ['liability', 'natural stone', 'fabrication', 'policy'],
        });
    });

    chatbotPolicies.approvedMessaging.forEach((note, index) => {
        entries.push({
            id: `policy-approved-${index}`,
            title: 'Approved operations messaging',
            text: note,
            tags: ['policy', 'operations'],
        });
    });

    curatedSlabOptions.forEach((group) => {
        group.options.forEach((option) => {
            entries.push({
                id: `slab-${option.value}`,
                title: `${option.label} (${group.group})`,
                text: `${option.label} is in our curated ${group.group.toLowerCase()} selection and commonly sourced through ${option.supplier}.`,
                tags: [group.group, option.label, option.supplier, 'curated', 'slab', option.value],
            });
        });
    });

    supplierSummaries.forEach((supplier) => {
        entries.push({
            id: `supplier-${supplier.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            title: `${supplier.name} distributor details`,
            text: `${supplier.name}: ${supplier.note} Address: ${supplier.address}. Phone: ${supplier.phone}.`,
            tags: [supplier.name, supplier.address, supplier.phone, 'supplier', 'distributor', 'materials'],
        });
    });

    homepageFaqItems.forEach((item, index) => {
        entries.push({
            id: `faq-${index}`,
            title: item.question,
            text: item.answer,
            tags: ['faq', 'materials', 'estimate'],
        });
    });

    materialPages.slice(0, MAX_MATERIAL_PAGES).forEach((page) => {
        entries.push({
            id: `material-${page.slug}`,
            title: page.headline,
            text: `${page.intro} Best for: ${page.bestFor.join(', ')}.`,
            tags: [page.material, page.city, page.state, 'materials'],
        });

        (page.faqItems || []).slice(0, 2).forEach((faq, idx) => {
            entries.push({
                id: `material-${page.slug}-faq-${idx}`,
                title: faq.question,
                text: faq.answer,
                tags: [page.material, page.city, page.state, 'faq'],
            });
        });
    });

    serviceAreas.slice(0, MAX_SERVICE_AREAS).forEach((area) => {
        entries.push({
            id: `service-${area.slug}`,
            title: `${area.city}, ${area.state} service area`,
            text: area.summary || area.intro || `We serve ${area.city}, ${area.state} for countertop fabrication and installation.`,
            tags: [area.city, area.state, 'service-area'],
        });

        (area.faqItems || []).slice(0, 1).forEach((faq, idx) => {
            entries.push({
                id: `service-${area.slug}-faq-${idx}`,
                title: faq.question,
                text: faq.answer,
                tags: [area.city, area.state, 'faq'],
            });
        });
    });

    return entries;
}

const KNOWLEDGE_BASE = buildEntries();
const PRIMARY_INTAKE_QUESTION = 'To move this forward quickly, share your city, project type, rough measurements (or sqft), material direction, and target timeline.';

const INTENT_KEYWORDS = {
    serviceArea: ['serve', 'service', 'coverage', 'travel', 'near me', 'city', 'location', 'zip'],
    materials: ['quartz', 'granite', 'quartzite', 'slab', 'material', 'stone', 'vein', 'veining', 'seam'],
    timeline: ['timeline', 'turnaround', 'fast', 'install', 'days', 'schedule', 'deposit', 'template'],
    estimate: ['estimate', 'quote', 'price', 'pricing', 'budget', 'cost', 'bid'],
    commercial: ['commercial', 'contractor', 'multi-unit', 'builder', 'apartment', 'hotel', 'office'],
    flipper: ['flipper', 'flip', 'turnover', 'investor', 'rehab', 'rental'],
    residential: ['residential', 'homeowner', 'my home', 'house', 'kitchen remodel', 'bath remodel'],
};

const RECOMMENDATION_KEYWORDS = ['recommend', 'suggest', 'best option', 'which one', 'what should i choose', 'what do you recommend'];

const RESIDENTIAL_CURATED = [
    'Calacatta Laza',
    'Calacatta Miraggio',
    'Kodiak',
    'Absolute Black',
];

const CONTRACTOR_CURATED = [
    'Kodiak',
    'Carrara Classique',
    'Calacatta Nile',
    'Absolute Black',
];

const BUILDER_CURATED = [
    'Carrara Classique',
    'Calacatta Nile',
    'Absolute Black',
];

function hasAny(text, words) {
    return words.some((word) => text.includes(word));
}

function pickCuratedByLabels(labels) {
    const wanted = new Set(labels.map((label) => normalize(label)));
    const picked = [];

    curatedSlabOptions.forEach((group) => {
        group.options.forEach((option) => {
            if (wanted.has(normalize(option.label))) {
                picked.push(option.label);
            }
        });
    });

    return picked.slice(0, 4);
}

function detectRecommendationIntent(message) {
    const normalized = normalize(message);
    const hasRecommendationCue = hasAny(normalized, RECOMMENDATION_KEYWORDS);
    const hasCountertopCue = /(countertop|kitchen|bath|vanity|slab|material|quartz|granite|quartzite|stone)/.test(normalized);

    return hasRecommendationCue && hasCountertopCue;
}

function detectSegmentForRecommendation(message) {
    const normalized = normalize(message);

    if (/(builder|new construction|multi-unit|multifamily|developer|apartments|units)/.test(normalized)) {
        return 'builder';
    }
    if (/(contractor|flipper|flip|investor|rental|turnover|rehab)/.test(normalized)) {
        return 'contractor';
    }

    return 'residential';
}

function buildCuratedRecommendationReply(message) {
    const segment = detectSegmentForRecommendation(message);
    const materialBias = normalize(message);
    const wantsGranite = materialBias.includes('granite');
    const wantsQuartzite = materialBias.includes('quartzite');
    const wantsQuartz = materialBias.includes('quartz');

    let picks;
    if (segment === 'builder') {
        picks = pickCuratedByLabels(BUILDER_CURATED);
    } else if (segment === 'contractor') {
        picks = pickCuratedByLabels(CONTRACTOR_CURATED);
    } else {
        picks = pickCuratedByLabels(RESIDENTIAL_CURATED);
    }

    // Light material steering without introducing prices.
    const laneHint = wantsQuartzite
        ? 'For a natural-stone look, quartzite-forward selections are usually the right lane.'
        : wantsGranite
            ? 'For a durable natural-stone lane, granite-forward selections are usually the right fit.'
            : wantsQuartz
                ? 'For low-maintenance installs, quartz-forward selections are usually the right fit.'
                : 'For most kitchens, we usually start with a quartz-forward shortlist and then validate natural-stone options if requested.';

    const pickLine = picks.length > 0
        ? `Curated shortlist: ${picks.join(', ')}.`
        : 'I can build a curated shortlist once I have your project details.';

    const segmentLine = segment === 'builder'
        ? 'For builder/new-construction work, we prioritize repeatable lanes and schedule reliability.'
        : segment === 'contractor'
            ? 'For contractor/flipper work, we prioritize durable lanes that move quickly through templating and install.'
            : 'For residential custom projects, we prioritize design fit, durability, and practical maintenance.';

    return `${segmentLine}\n\n${laneHint} ${pickLine}\n\nNext step: share your city, rough sqft, and preferred look (clean white, warm veining, or bold movement), and I’ll narrow this to the best 2-3 curated options.`;
}

function firstMatchIndex(text, pattern) {
    const match = text.match(pattern);
    return match ? match.index : Number.POSITIVE_INFINITY;
}

function detectIntents(message) {
    const normalized = normalize(message);
    const naturalStoneSelection = /(granite|quartzite|marble|natural stone)/.test(normalized);
    const naturalStoneRiskTopic = /(variation|vein|veining|fissure|movement|seam|guarantee|exact match|bookmatch)/.test(normalized);
    const removalReuseTopic = /(tear.?out|tear out|removal|remove|reuse|reinstall|existing tops|backsplash|vanity|porcelain|sink|chip|crack|separate)/.test(normalized);

    return {
        serviceArea: hasAny(normalized, INTENT_KEYWORDS.serviceArea),
        materials: hasAny(normalized, INTENT_KEYWORDS.materials),
        timeline: hasAny(normalized, INTENT_KEYWORDS.timeline),
        estimate: hasAny(normalized, INTENT_KEYWORDS.estimate),
        commercial: hasAny(normalized, INTENT_KEYWORDS.commercial),
        flipper: hasAny(normalized, INTENT_KEYWORDS.flipper),
        residential: hasAny(normalized, INTENT_KEYWORDS.residential),
        naturalStoneDisclosure: naturalStoneSelection || (naturalStoneRiskTopic && naturalStoneSelection),
        removalDisclosure: removalReuseTopic,
    };
}

function selectCta(intents) {
    if (intents.commercial) {
        return 'Next step: send unit count, weekly install pace, city, and start date so we can route this through commercial intake today.';
    }
    if (intents.flipper) {
        return 'Next step: send city, project phase/status, rough sqft, and budget range so we can align to your turnover timeline.';
    }
    if (intents.residential) {
        return 'Next step: send city, room type, phase/status, rough sqft, and budget range so we can guide the right slab lane.';
    }

    if (intents.estimate) {
        return 'Next step: send photos/layout and rough measurements so we can turn this into a usable estimate direction.';
    }

    if (intents.timeline) {
        return 'Next step: share city, sqft, and material lane so we can confirm a realistic install window.';
    }

    if (intents.serviceArea) {
        return 'Next step: send your city and project type and we’ll confirm service fit and scheduling path.';
    }

    if (intents.materials) {
        return 'Next step: send your room type, city, and material preference so we can narrow the slab lane quickly.';
    }

    return 'Next step: share city, project type, rough measurements, and material direction so we can guide the fastest path.';
}

function formatRelated(scoredEntries) {
    const supplemental = scoredEntries.slice(1).map((item) => item.entry.title);
    return '';
}

function resolveSpecificWaiverNote(message) {
    const normalized = normalize(message);
    const removalIdx = firstMatchIndex(
        normalized,
        /(tear.?out|tear out|removal|remove|reuse|reinstall|existing tops|backsplash|vanity|porcelain|sink|chip|crack|separate)/
    );
    const naturalStoneIdx = firstMatchIndex(
        normalized,
        /(granite|quartzite|marble|natural stone|variation|vein|veining|fissure|movement|exact match|bookmatch)/
    );
    const veinMatchIdx = firstMatchIndex(
        normalized,
        /(vein match|vein matching|bookmatch|full.?height backsplash|large island|oversized island|additional slab|pattern continuity)/
    );

    const first = Math.min(removalIdx, naturalStoneIdx, veinMatchIdx);
    if (!Number.isFinite(first)) {
        return '';
    }

    if (first === removalIdx) {
        return (chatbotPolicies.removalWaiverNotes || [])[0] || '';
    }

    if (first === veinMatchIdx) {
        return (chatbotPolicies.materialHandlingPolicies || [])[1]
            || (chatbotPolicies.materialHandlingPolicies || [])[2]
            || '';
    }

    if (first === naturalStoneIdx) {
        return chatbotPolicies.liabilityNotes[0] || '';
    }

    return '';
}

function buildOperationalReply(message, scoredEntries) {
    const intents = detectIntents(message);
    const cta = selectCta(intents);
    const top = scoredEntries[0]?.entry;
    const topText = top?.text || 'Urban Stone can guide material direction, timeline, and estimate prep.';
    const normalizedTop = normalize(topText);

    const includeIfNotDuplicate = (paragraph, duplicateSignals = []) => {
        const hasDuplicateSignal = duplicateSignals.some((signal) => normalizedTop.includes(signal));
        return hasDuplicateSignal ? topText : `${topText}\n\n${paragraph}`;
    };

    if (!top) {
        return `Urban Stone keeps countertop projects moving with a clear sequence: slab direction, field measurement, then fabrication and install.\n\n${cta}`;
    }

    if (intents.commercial) {
        const merged = includeIfNotDuplicate(
            'For contractor and multi-unit work, Urban Stone scopes rollout cadence, material lane, and install sequencing before finalizing numbers.',
            ['contractor and multi-unit', 'rollout cadence']
        );
        return `${merged}\n\n${cta}`;
    }

    if (intents.flipper) {
        const merged = includeIfNotDuplicate(
            'For flipper projects, we keep recommendations focused on timeline reliability, rentable/resale-friendly slab lanes, and clean install sequencing.',
            ['flipper projects', 'turnover projects']
        );
        return `${merged}\n\n${cta}`;
    }

    if (intents.residential) {
        const alreadyResidentialGuidance =
            /(residential custom|guide slab selection|installation path|install path|templating readiness)/.test(normalizedTop);
        if (alreadyResidentialGuidance) {
            return `${topText}\n\n${cta}`;
        }
        const merged = includeIfNotDuplicate(
            'For residential custom projects, we guide design fit, maintenance expectations, and a practical install path.',
            ['for residential custom projects', 'residential custom intake']
        );
        return `${merged}\n\n${cta}`;
    }

    if (intents.serviceArea) {
        return `${topText}\n\n${cta}`;
    }

    if (intents.estimate) {
        return `${topText}\n\nUrban Stone quotes fastest when we have project photos/layout plus rough measurements.\n\n${cta}`;
    }

    if (intents.timeline) {
        const merged = includeIfNotDuplicate(
            'Our workflow is straightforward: shortlist slab direction, confirm field measurements, then fabricate and install on schedule.',
            ['urban stone workflow', 'shortlist slab direction']
        );
        return `${merged}\n\n${cta}`;
    }

    if (intents.materials) {
        return `${topText}\n\nWe help compare quartz, granite, and quartzite by maintenance, slab character, and timeline fit.\n\n${cta}`;
    }

    return `${topText}\n\n${cta}`;
}

export function getChatReply(message) {
    const tokens = tokenize(message);
    const normalizedMessage = normalize(message);

    if (detectRecommendationIntent(message)) {
        return {
            reply: buildCuratedRecommendationReply(message),
            sources: [],
        };
    }

    if (!tokens.length) {
        return {
            reply: `Tell me the project type and material direction, and I’ll keep this simple.\n\nNext step: ${PRIMARY_INTAKE_QUESTION.replace('To move this forward quickly, ', '').replace(/^share/i, 'Share')}`,
            sources: [],
        };
    }

    const scored = KNOWLEDGE_BASE.map((entry) => ({
        entry,
        score: scoreEntry(tokens, entry, normalizedMessage),
    }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    if (!scored.length) {
        return {
            reply: `Urban Stone can help with material selection, timing, and estimate prep.\n\nNext step: ${PRIMARY_INTAKE_QUESTION.replace('To move this forward quickly, ', '').replace(/^share/i, 'Share')}`,
            sources: [],
        };
    }

    const reply = buildOperationalReply(message, scored);
    const intents = detectIntents(message);
    const note = resolveSpecificWaiverNote(message);
    const liabilityNote = (intents.naturalStoneDisclosure || intents.removalDisclosure) && note
        ? `\n\nNote: ${note}`
        : '';
    const sources = Array.from(new Set(scored.slice(0, 3).map((item) => item.entry.title))).slice(0, 2);

    return {
        reply: `${reply}${liabilityNote}`,
        sources,
    };
}
