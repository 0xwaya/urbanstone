# Lead Sourcer -> Zapier Field Contract

This document defines the canonical payload and Zap field mappings for Lead Sourcer outputs.
Use this as the single source of truth when updating Lead Sourcer or Zap mappings.

## Canonical Payload Shape

```json
{
  "source": "reddit|craigslist|apify-*|lead-sourcer-run-report",
  "requestId": "lead-sourcer/<source>/<id>",
  "submittedAt": "ISO-8601",
  "dedupeKey": "stable-id",
  "lead": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "projectDetails": "string",
    "externalPostId": "string",
    "externalPostUrl": "string"
  },
  "metadata": {
    "routeId": "lead-sourcer/<source>",
    "scoreBand": "string",
    "score": "string",
    "verdict": "match|borderline|reject|string",
    "dedupeKey": "stable-id",
    "automated": "boolean|string",
    "ip": "string",
    "userAgent": "string",
    "referer": "string",
    "hasAnchor": "boolean|string",
    "signalFactors": "string (JSON when object)"
  }
}
```

Rules:
- Missing optional fields are emitted as `""` (empty string), not `null` and not omitted.
- `requestId`, `submittedAt`, and `dedupeKey` are always present at the top level.
- `metadata.dedupeKey` mirrors top-level `dedupeKey`.
- During migration, legacy aliases are emitted for compatibility:
  - `357570886__metadata__requestId` (alias of top-level `requestId`)
  - `357570886__metadata__dedupeKey` (alias of top-level `dedupeKey`)

## Zap Mapping (namespace `357570886`)

- `source` -> `357570886__source`
- `lead.name` -> `357570886__lead__name`
- `lead.email` -> `357570886__lead__email`
- `lead.phone` -> `357570886__lead__phone`
- `lead.projectDetails` -> `357570886__lead__projectDetails`
- `lead.externalPostId` -> `357570886__lead__externalPostId`
- `lead.externalPostUrl` -> `357570886__lead__externalPostUrl`
- `metadata.routeId` -> `357570886__metadata__routeId`
- `metadata.scoreBand` -> `357570886__metadata__scoreBand`
- `metadata.score` -> `357570886__metadata__score`
- `metadata.verdict` -> `357570886__metadata__verdict`
- `requestId` -> `357570886__requestId`
- `submittedAt` -> `357570886__submittedAt`
- `dedupeKey` -> `357570886__dedupeKey`
- `metadata.automated` -> `357570886__metadata__automated`
- `metadata.ip` -> `357570886__metadata__ip`
- `metadata.userAgent` -> `357570886__metadata__userAgent`
- `metadata.referer` -> `357570886__metadata__referer`
- `metadata.hasAnchor` -> `357570886__metadata__hasAnchor`
- `metadata.signalFactors` -> `357570886__metadata__signalFactors`

## Implementation Location

- Canonical normalization: `src/core/field-mapping.js` (`normalizeLeadPayload`)
- Zap field expansion: `src/core/field-mapping.js` (`buildZapFields`)
- Relay wiring: `src/relay.js` (`toZapReadyPayload` before webhook POST)

## Change Procedure

1. Update the map in `src/core/field-mapping.js`.
2. Update this contract document.
3. Run `npm test` in `lead-sourcer`.
4. In Zap, migrate references to top-level IDs:
   - `{{357570886__metadata__requestId}}` -> `{{357570886__requestId}}`
   - `{{357570886__metadata__dedupeKey}}` -> `{{357570886__dedupeKey}}`
5. Validate one live webhook payload against Zap sample data.
