# Lead Sourcer -> Zapier Architecture

This document captures the exact Zap Definition Language (ZDL) contract used by Urban Stone lead intake.

## Webhook Intake Layer

Lead Sourcer posts JSON to `LEAD_WEBHOOK_URL` (Zapier Catch Hook URL).

Expected payload shape:

```json
{
  "requestId": "string",
  "dedupeKey": "string",
  "source": "string",
  "submittedAt": "timestamp",
  "lead": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "projectDetails": "string",
    "externalPostId": "string",
    "externalPostUrl": "string"
  },
  "metadata": {
    "automated": true,
    "routeId": "string",
    "scoreBand": "hot|warm|tepid|string",
    "score": "number|string",
    "verdict": "string",
    "hasAnchor": "boolean|string",
    "signalFactors": "string",
    "ip": "string",
    "userAgent": "string",
    "referer": "string"
  }
}
```

## Processing Pipeline (Zap)

1. Intake: Catch Hook receives payload.
2. Validation filter: continue only when all are true.
   - `lead.email` is non-empty
   - `lead.phone` is non-empty
   - `metadata.automated = true`
3. Dedup lookup in Zapier Storage using key `dedup::{{dedupeKey}}`.
4. New lead filter: continue only when key is missing.
5. Mark processed: set `dedup::{{dedupeKey}} = "1"` in Zapier Storage.
6. Routing paths:
   - Hot/Warm branch when `metadata.scoreBand` is `hot` or `warm`
   - Tepid branch when `metadata.scoreBand` is `tepid`
   - Fallback branch for any other case

## Lead Sourcer Wiring

- Payload builder: `src/core/payload.js`
- Canonical field normalization and Zap flat fields: `src/core/field-mapping.js`
- Webhook relay: `src/relay.js`
- Local dedupe (pre-Zap): `src/dedup.js` + `src/core/dedup-store.js`

Lead Sourcer currently performs local dedup before relay and Zap performs authoritative dedup in Storage.

## Compliance Guarantees in Code

Lead Sourcer guarantees these fields are present on every relay:

- Top level: `requestId`, `dedupeKey`, `source`, `submittedAt`
- `lead`: `name`, `email`, `phone`, `projectDetails`, `externalPostId`, `externalPostUrl`
- `metadata`: `automated`, `routeId`, `scoreBand`, `score`, `verdict`, `hasAnchor`, `signalFactors`, `ip`, `userAgent`, `referer`

For automated sourced leads where real contact info is unavailable:

- `lead.email` defaults to deterministic placeholder `auto+<dedupeKey>@urbanstone.co`
- `lead.phone` defaults to deterministic placeholder `+1-000-000-<last4>`

These can be overridden with environment variables:

- `LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL`
- `LEAD_SOURCER_AUTOMATED_CONTACT_EMAIL_DOMAIN`
- `LEAD_SOURCER_AUTOMATED_CONTACT_PHONE`

## Backend Integration Checklist

1. Set `LEAD_WEBHOOK_URL` to your Zap Catch Hook URL.
2. Ensure each payload has stable `dedupeKey`.
3. Keep `metadata.automated = true`.
4. Keep `metadata.scoreBand` in `hot|warm|tepid` for deterministic routing.
5. Keep all expected fields present to avoid Zap sample/mapping drift.
