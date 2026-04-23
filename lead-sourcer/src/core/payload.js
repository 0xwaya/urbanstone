function formatProjectDetails({ source, title, body, url }) {
    return `[${source.toUpperCase()} MATCH]\n\nTitle: ${title}\n\n${body || ''}\n\nPost URL: ${url}`;
}

function buildAutomatedRequestId({ routePrefix, source, id }) {
    return `${routePrefix}/${source}/${id}`.slice(0, 120);
}

export function buildAutomatedLeadPayload({
    id,
    source,
    title,
    body,
    url,
    author,
    createdAt,
    routePrefix = 'lead-sourcer',
    verdict = null,
    scoreResult = null,
    sourceSubreddit = null,
}) {
    const normalizedVerdict = verdict || 'match';
    const normalizedScore = Number.isFinite(scoreResult?.score) ? scoreResult.score : null;
    const normalizedBand = typeof scoreResult?.band === 'string' ? scoreResult.band : null;
    const normalizedAnchored = typeof scoreResult?.anchored === 'boolean' ? scoreResult.anchored : null;
    const normalizedFactors = scoreResult?.factors && typeof scoreResult.factors === 'object'
        ? {
            directMatches: Number(scoreResult.factors.directMatches || 0),
            materialSignals: Number(scoreResult.factors.materialSignals || 0),
            projectContext: Number(scoreResult.factors.projectContext || 0),
            intentSignals: Number(scoreResult.factors.intentSignals || 0),
            excluded: Number(scoreResult.factors.excluded || 0),
        }
        : null;

    const requestId = buildAutomatedRequestId({ routePrefix, source, id });

    return {
        submittedAt: createdAt,
        source,
        requestId,
        dedupeKey: id,
        verdict: normalizedVerdict,
        score: normalizedScore,
        scoreBand: normalizedBand,
        hasAnchor: normalizedAnchored,
        lead: {
            name: author || 'Anonymous',
            email: '',
            phone: '',
            projectDetails: formatProjectDetails({ source, title, body, url }),
            externalPostId: id,
            externalPostUrl: url || '',
        },
        metadata: {
            requestId,
            routeId: `${routePrefix}/${source}`,
            dedupeKey: id,
            automated: true,
            verdict: normalizedVerdict,
            score: normalizedScore,
            scoreBand: normalizedBand,
            hasAnchor: normalizedAnchored,
            signalFactors: normalizedFactors,
            sourceSubreddit: sourceSubreddit || null,
        },
    };
}
