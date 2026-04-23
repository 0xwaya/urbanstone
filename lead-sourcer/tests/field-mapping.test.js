import { buildZapFields, normalizeLeadPayload, toZapReadyPayload } from '../src/core/field-mapping.js';

describe('field mapping', () => {
    test('normalizes missing optional values to empty strings', () => {
        const normalized = normalizeLeadPayload({
            source: 'reddit',
            lead: { name: 'alice' },
            metadata: { routeId: 'lead-sourcer/reddit' },
        });

        expect(normalized).toMatchObject({
            source: 'reddit',
            requestId: '',
            dedupeKey: '',
            lead: {
                name: 'alice',
                email: '',
                phone: '',
                projectDetails: '',
                externalPostId: '',
                externalPostUrl: '',
            },
            metadata: {
                routeId: 'lead-sourcer/reddit',
                scoreBand: '',
                score: '',
                verdict: '',
                dedupeKey: '',
                automated: '',
                ip: '',
                userAgent: '',
                referer: '',
                hasAnchor: '',
                signalFactors: '',
            },
        });
    });

    test('builds zap field keys with configured namespace', () => {
        const normalized = normalizeLeadPayload({
            source: 'reddit',
            requestId: 'lead-sourcer/reddit/reddit:abc',
            submittedAt: '2026-04-23T12:00:00.000Z',
            lead: {
                name: 'test',
                email: 'x@example.com',
                phone: '1112223333',
                projectDetails: 'details',
                externalPostId: 'reddit:abc',
                externalPostUrl: 'https://reddit.com/post',
            },
            metadata: {
                routeId: 'lead-sourcer/reddit',
                scoreBand: 'warm',
                score: 72,
                verdict: 'match',
            },
        });

        const mapped = buildZapFields(normalized, '357570886');
        expect(mapped).toMatchObject({
            '357570886__source': 'reddit',
            '357570886__lead__name': 'test',
            '357570886__lead__email': 'x@example.com',
            '357570886__lead__phone': '1112223333',
            '357570886__lead__projectDetails': 'details',
            '357570886__lead__externalPostId': 'reddit:abc',
            '357570886__lead__externalPostUrl': 'https://reddit.com/post',
            '357570886__metadata__routeId': 'lead-sourcer/reddit',
            '357570886__metadata__scoreBand': 'warm',
            '357570886__metadata__score': '72',
            '357570886__metadata__verdict': 'match',
            '357570886__requestId': 'lead-sourcer/reddit/reddit:abc',
            '357570886__submittedAt': '2026-04-23T12:00:00.000Z',
            '357570886__dedupeKey': 'reddit:abc',
            '357570886__metadata__automated': '',
            '357570886__metadata__ip': '',
            '357570886__metadata__userAgent': '',
            '357570886__metadata__referer': '',
            '357570886__metadata__hasAnchor': '',
            '357570886__metadata__signalFactors': '',
        });
    });

    test('toZapReadyPayload includes both mapped and canonical fields', () => {
        const payload = toZapReadyPayload({
            source: 'reddit',
            requestId: 'lead-sourcer/reddit/reddit:xyz',
            submittedAt: '2026-04-23T12:00:00.000Z',
            lead: { name: 'Name', externalPostId: 'reddit:xyz' },
            metadata: { routeId: 'lead-sourcer/reddit', verdict: 'match' },
        }, { namespace: '357570886' });

        expect(payload).toHaveProperty('357570886__source', 'reddit');
        expect(payload).toHaveProperty('357570886__lead__name', 'Name');
        expect(payload).toHaveProperty('357570886__dedupeKey', 'reddit:xyz');
        expect(payload).toHaveProperty('357570886__metadata__requestId', 'lead-sourcer/reddit/reddit:xyz');
        expect(payload).toHaveProperty('357570886__metadata__dedupeKey', 'reddit:xyz');
        expect(payload).toHaveProperty('source', 'reddit');
        expect(payload).toHaveProperty('lead');
        expect(payload).toHaveProperty('metadata');
    });

    test('serializes signalFactors objects to stable strings', () => {
        const payload = toZapReadyPayload({
            source: 'reddit',
            requestId: 'lead-sourcer/reddit/reddit:abc',
            dedupeKey: 'reddit:abc',
            submittedAt: '2026-04-23T12:00:00.000Z',
            lead: { name: 'Name', externalPostId: 'reddit:abc' },
            metadata: {
                routeId: 'lead-sourcer/reddit',
                signalFactors: { directMatches: 2, intentSignals: 1 },
            },
        }, { namespace: '357570886' });

        expect(payload['357570886__metadata__signalFactors']).toBe('{"directMatches":2,"intentSignals":1}');
    });
});
