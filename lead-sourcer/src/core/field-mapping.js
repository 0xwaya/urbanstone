const DEFAULT_ZAP_NAMESPACE = process.env.LEAD_SOURCER_ZAP_FIELD_NAMESPACE || '357570886';
const EMIT_LEGACY_METADATA_ID_ALIASES = !['0', 'false', 'no', 'off'].includes(
    String(process.env.LEAD_SOURCER_EMIT_LEGACY_METADATA_ID_ALIASES || 'true').trim().toLowerCase(),
);

function toStringOrEmpty(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return '';
}

function serializeSignalFactors(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return '';
        }
    }
    return toStringOrEmpty(value);
}

function resolveRequestId(payload) {
    return payload?.requestId
        || payload?.metadata?.requestId
        || '';
}

function resolveDedupeKey(payload) {
    return payload?.dedupeKey
        || payload?.metadata?.dedupeKey
        || payload?.lead?.externalPostId
        || '';
}

function resolveSubmittedAt(payload) {
    return payload?.submittedAt || new Date().toISOString();
}

export function normalizeLeadPayload(payload = {}) {
    const requestId = toStringOrEmpty(resolveRequestId(payload));
    const dedupeKey = toStringOrEmpty(resolveDedupeKey(payload));

    return {
        source: toStringOrEmpty(payload?.source),
        requestId,
        submittedAt: toStringOrEmpty(resolveSubmittedAt(payload)),
        dedupeKey,
        lead: {
            name: toStringOrEmpty(payload?.lead?.name),
            email: toStringOrEmpty(payload?.lead?.email),
            phone: toStringOrEmpty(payload?.lead?.phone),
            projectDetails: toStringOrEmpty(payload?.lead?.projectDetails),
            externalPostId: toStringOrEmpty(payload?.lead?.externalPostId),
            externalPostUrl: toStringOrEmpty(payload?.lead?.externalPostUrl),
        },
        metadata: {
            routeId: toStringOrEmpty(payload?.metadata?.routeId),
            scoreBand: toStringOrEmpty(payload?.metadata?.scoreBand),
            score: toStringOrEmpty(payload?.metadata?.score),
            verdict: toStringOrEmpty(payload?.metadata?.verdict || payload?.verdict),
            dedupeKey,
            automated: toStringOrEmpty(payload?.metadata?.automated),
            ip: toStringOrEmpty(payload?.metadata?.ip),
            userAgent: toStringOrEmpty(payload?.metadata?.userAgent),
            referer: toStringOrEmpty(payload?.metadata?.referer),
            hasAnchor: toStringOrEmpty(payload?.metadata?.hasAnchor),
            signalFactors: serializeSignalFactors(payload?.metadata?.signalFactors),
        },
    };
}

const ZAP_FIELD_MAP = Object.freeze({
    source: '__source',
    'lead.name': '__lead__name',
    'lead.email': '__lead__email',
    'lead.phone': '__lead__phone',
    'lead.projectDetails': '__lead__projectDetails',
    'lead.externalPostId': '__lead__externalPostId',
    'lead.externalPostUrl': '__lead__externalPostUrl',
    'metadata.routeId': '__metadata__routeId',
    'metadata.scoreBand': '__metadata__scoreBand',
    'metadata.score': '__metadata__score',
    'metadata.verdict': '__metadata__verdict',
    requestId: '__requestId',
    submittedAt: '__submittedAt',
    dedupeKey: '__dedupeKey',
    'metadata.automated': '__metadata__automated',
    'metadata.ip': '__metadata__ip',
    'metadata.userAgent': '__metadata__userAgent',
    'metadata.referer': '__metadata__referer',
    'metadata.hasAnchor': '__metadata__hasAnchor',
    'metadata.signalFactors': '__metadata__signalFactors',
});

function buildLegacyZapAliases(canonicalPayload, namespace) {
    if (!EMIT_LEGACY_METADATA_ID_ALIASES) return {};

    return {
        [`${namespace}__metadata__requestId`]: toStringOrEmpty(canonicalPayload?.requestId),
        [`${namespace}__metadata__dedupeKey`]: toStringOrEmpty(canonicalPayload?.dedupeKey),
    };
}

function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

export function buildZapFields(canonicalPayload, namespace = DEFAULT_ZAP_NAMESPACE) {
    const out = {};
    for (const [path, suffix] of Object.entries(ZAP_FIELD_MAP)) {
        const key = `${namespace}${suffix}`;
        out[key] = toStringOrEmpty(getByPath(canonicalPayload, path));
    }
    return out;
}

export function toZapReadyPayload(payload, { namespace = DEFAULT_ZAP_NAMESPACE } = {}) {
    const canonical = normalizeLeadPayload(payload);
    const zapFields = buildZapFields(canonical, namespace);
    const legacyAliases = buildLegacyZapAliases(canonical, namespace);

    return {
        ...zapFields,
        ...legacyAliases,
        ...canonical,
    };
}
