function formatProjectDetails({ source, title, body, url }) {
    return `[${source.toUpperCase()} MATCH]\n\nTitle: ${title}\n\n${body || ''}\n\nPost URL: ${url}`;
}

export function buildAutomatedLeadPayload({ id, source, title, body, url, author, createdAt, routePrefix = 'lead-sourcer' }) {
    return {
        submittedAt: createdAt,
        source,
        lead: {
            name: author || 'Anonymous',
            email: null,
            phone: null,
            projectDetails: formatProjectDetails({ source, title, body, url }),
            externalPostId: id,
            externalPostUrl: url,
        },
        metadata: {
            routeId: `${routePrefix}/${source}`,
            dedupeKey: id,
            automated: true,
        },
    };
}