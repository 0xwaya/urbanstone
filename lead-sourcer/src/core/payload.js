function formatProjectDetails({ source, title, body, url }) {
    return `[${source.toUpperCase()} MATCH]\n\nTitle: ${title}\n\n${body || ''}\n\nPost URL: ${url}`;
}

function buildAutomatedRequestId({ routePrefix, source, id }) {
    return `${routePrefix}/${source}/${id}`.slice(0, 120);
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
            requestId: buildAutomatedRequestId({ routePrefix, source, id }),
            routeId: `${routePrefix}/${source}`,
            dedupeKey: id,
            automated: true,
        },
    };
}