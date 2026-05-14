function formatProjectDetails({ source, title, body, url }) {
    return `[${source.toUpperCase()} MATCH]\n\nTitle: ${title}\n\n${body || ''}\n\nPost URL: ${url}`;
}

function buildAutomatedRequestId({ routePrefix, source, id }) {
    return `${routePrefix}/${source}/${id}`.slice(0, 120);
}

function sanitizeEmailLocalPart(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'unknown';
}

function resolveAutomatedContactEmail(id) {
    const explicit = String(process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL || '').trim();
    if (explicit) return explicit;

    const domain = String(process.env.LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL_DOMAIN || 'urbanstone.co').trim().toLowerCase();
    const local = sanitizeEmailLocalPart(id);
    return `auto+${local}@${domain}`;
}

function resolveAutomatedContactPhone(id) {
    const explicit = String(process.env.LEAD_SOURCER_AUTOMATED_CONTACT_PHONE || '').trim();
    if (explicit) return explicit;

    const suffix = String(id || '').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
    return `+1-000-000-${suffix}`;
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
    const contactEmail = resolveAutomatedContactEmail(id);
    const contactPhone = resolveAutomatedContactPhone(id);

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
            // Zap intake requires non-empty contact fields for automated leads.
            email: contactEmail,
            phone: contactPhone,
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
