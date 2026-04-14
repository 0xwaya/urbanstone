import { homepageFaqItems } from '../../data/homepage-content';
import { materialPages } from '../../data/material-pages';
import { serviceAreas } from '../../data/service-areas';
import { chatbotPolicies } from '../../data/chatbot-knowledge';

const MAX_MATERIAL_PAGES = 30;
const MAX_SERVICE_AREAS = 30;

function normalize(text) {
    return String(text || '').toLowerCase();
}

function tokenize(text) {
    return normalize(text)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function scoreEntry(tokens, entry) {
    const haystack = normalize(`${entry.title} ${entry.text} ${entry.tags.join(' ')}`);
    return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
}

function buildEntries() {
    const entries = [];

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

export function getChatReply(message) {
    const tokens = tokenize(message);

    if (!tokens.length) {
        return {
            reply: 'Tell me a bit about your project (kitchen, bath, bar, etc.) and what material you’re considering, and HavenBot will help fast.',
            sources: [],
        };
    }

    const scored = KNOWLEDGE_BASE.map((entry) => ({
        entry,
        score: scoreEntry(tokens, entry),
    }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    if (!scored.length) {
        return {
            reply: 'HavenBot can help with material selection, timing, and estimates. Share your city, project type, and any preferred material and you’ll get guidance from here.',
            sources: [],
        };
    }

    const top = scored[0].entry;
    const supplemental = scored.slice(1).map((item) => item.entry.title);

    return {
        reply: `${top.text}${supplemental.length ? `\n\nRelated: ${supplemental.join(' · ')}` : ''}`,
        sources: [top.title],
    };
}
