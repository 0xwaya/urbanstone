# Lead Sourcer

Automated B2B lead sourcing for Urban Stone Collective. Polls new building permits
(Hamilton County ezTrak, City of Cincinnati open data, Butler County Accela), scores
kitchen / bath / countertop work, and emails each lead to sales@.

Retired on 2026-10-30 (code removed, switches ignored): Reddit, Craigslist and
Apify (Facebook Marketplace / Groups / Ad Library, Nextdoor). Old repo variables such as
`LEAD_SOURCER_ENABLE_REDDIT`, `LEAD_SOURCER_ENABLE_CRAIGSLIST`, `LEAD_SOURCER_ENABLE_APIFY`
and `APIFY_*` have no effect.

## Architecture

### Polling (live sources; the run report lists Hamilton County, then Cincinnati, then Butler County)
- **County permits (B2B, opt-in):** Hamilton County ezTrak and Butler County Accela Citizen Access
  (`src/accela.js` shared scraper, `src/permits-accela.js` county configs). Anonymous date-range General
  Search only (never the reCAPTCHA pages), 1 request/sec, timeouts + retries, capped detail fetches.
  Record-type filter first, then the `LEAD_SOURCER_PERMITS_KEYWORDS` / exclusion lists shared with the
  Cincinnati permits source; owner-pulled permits are skipped. Leads are internal-only (sales@), dedupe
  keys `eztrak:<permit>` / `butler:<permit>`, routes `lead-sourcer/permits-hamilton` / `lead-sourcer/permits-butler`.
  Switches: `LEAD_SOURCER_ENABLE_PERMITS_HAMILTON`, `LEAD_SOURCER_ENABLE_PERMITS_BUTLER` (default false).
  Tuning: `LEAD_SOURCER_ACCELA_LOOKBACK_DAYS` (7), `_MAX_PAGES` (40), `_MAX_DETAILS` (40 per county per run),
  `_MIN_INTERVAL_MS` (1000), `_TIMEOUT_MS` (30000), `_RETRIES` (2), `_TYPE_KEYWORDS`, `_TYPE_EXCLUDE`.
  Warn-only in run health. Run one county: `npm run poll:permits-hamilton` / `npm run poll:permits-butler`.

- **Cincinnati permits (B2B, opt-in):** City of Cincinnati Socrata data (`src/permits.js`), switch
  `LEAD_SOURCER_ENABLE_PERMITS`.

The Node runner calls these sources directly and emails matches to sales@.
Zapier is retired. See `docs/RETIRED-zapier.md`.

### Scoring
`scorePermit` in `src/permits.js`: counter > kitchen > bath/vanity > remodel, plus a valuation bonus.

### Delivery
Direct email via Resend API → `sales@urbanstone.co`. Each lead is a branded HTML email
(navy/gold, `src/lead-email.js`) with a plain-text alternative: company, source, area,
project type, valuation, phone/email, permit # and a link to the permit record. Empty
fields are hidden. Preview with a fake lead: `npm run email:sample` (writes
`runs/sample-lead-email/`).

The Zapier catch-hook was retired on 2026-10-30. `LEAD_WEBHOOK_URL` is not read.

## Setup

### Environment Variables

**Required for live delivery:**
```
RESEND_API_KEY=...                 # Direct email to sales@
```

`LEAD_WEBHOOK_URL` is retired. Do not set it.

**Optional (defaults shown):**
```
LEAD_SOURCER_ENABLE_PERMITS_HAMILTON=false
LEAD_SOURCER_ENABLE_PERMITS=false
LEAD_SOURCER_ENABLE_PERMITS_BUTLER=false
LEAD_SOURCER_ALERT_EMAIL=sales@urbanstone.co  # Lead alert recipient
LEAD_SOURCER_RUN_REPORT_EMAIL=sales@urbanstone.co  # Run report recipient
LEAD_SOURCER_SEND_RUN_REPORT=true  # Send when there is a lead, a source is down, or it is the Friday 5 PM heartbeat
```

Files: `.env`, `.env.local`, `.vercel/.env.production.local`

### Installation

```bash
cd lead-sourcer
npm install
```

### Running

Unspecified runs default to `review-only`: matches are logged locally without
Resend delivery. Set `LEAD_SOURCER_MODE=live` explicitly only when
internal lead notifications are intended. The sourcer does not contact authors
of public posts; direct prospect outreach is not implemented.

**One-shot live run:**
```bash
LEAD_SOURCER_MODE=live node src/index.js
```

**One-shot dry run (no relay):**
```bash
LEAD_SOURCER_MODE=dry node src/index.js
```

**Interval polling (configurable minutes):**
```bash
LEAD_SOURCER_INTERVAL_MINUTES=60 node src/index.js  # Run every 60 min
```

### Scheduling

The canonical command is `npm run sourcer`. An explicitly live one-shot run is
guarded by the daily state file at `runs/daily-state.json`, so repeated scheduler
invocations do not duplicate the daily run. The cron helper resolves paths
relative to this checkout and defaults to review-only; it does not contact prospects.

**GitHub Actions (recommended runner):** `.github/workflows/lead-sourcer.yml` runs
at 8:07 AM, 12:07 PM and 5:07 PM America/New_York, Monday through Friday. GitHub
reads those times in `America/New_York`, so daylight time does not need a second
cron. `src/schedule-guard.js` still skips a scheduled run that starts on Saturday
or Sunday. A manual run still works on a weekend. Live runs use a cooldown (`LEAD_SOURCER_COOLDOWN_HOURS`, default 3); the
dispatch input `force` skips it once. It runs the tests,
`scripts/check-config.mjs`, then `node src/index.js`, and carries `seen-ids.json` and
`runs/` between runs with the Actions cache. Controls (repo variables):

- `LEAD_SOURCER_MODE` — `review-only` (default, no delivery) or `live` (email to sales@)
- `LEAD_SOURCER_ENABLE_PERMITS_HAMILTON` / `LEAD_SOURCER_ENABLE_PERMITS` /
  `LEAD_SOURCER_ENABLE_PERMITS_BUTLER` — permit sources, default `false`
- Secrets used: `RESEND_API_KEY` (and optional `SOCRATA_APP_TOKEN`). `LEAD_WEBHOOK_URL`
  is retired and must not be set. Reddit/Apify secrets and variables passed by the
  workflow are ignored by the code.

Permit sources are warn-only; a run exits non-zero only when every enabled source
failed, so a fully broken run shows up as a failed workflow instead of a quiet "0 leads".

Vercel has a trigger route at `frontend/pages/api/cron/lead-sourcer.js`, but it is
not scheduled because it requires a public authenticated `LEAD_SOURCER_TRIGGER_URL`
for an external runner. Do not enable a Vercel cron until that runner exists.

## Payload Format

Leads are emailed to sales@. The alert body is built from this payload shape:

```json
{
  "submittedAt": "2026-05-14T14:47:53.801Z",
  "source": "permits-hamilton",
  "requestId": "lead-sourcer/permits-hamilton/eztrak:BLD2026-0001",
  "dedupeKey": "eztrak:BLD2026-0001",
  "verdict": "match",
  "score": 78,
  "scoreBand": "warm",
  "hasAnchor": true,
  "lead": {
    "name": "Example Builders LLC",
    "email": "office@example.invalid",
    "phone": "(513) 555-0100",
    "projectDetails": "[PERMITS-HAMILTON MATCH]\n\nTitle: ...\n\nContractor: ...",
    "externalPostId": "eztrak:BLD2026-0001",
    "externalPostUrl": "https://eztrak.cagis.org/CitizenAccess/..."
  },
  "metadata": {
    "routeId": "lead-sourcer/permits-hamilton",
    "scoreBand": "warm",
    "score": 78,
    "verdict": "match",
    "dedupeKey": "eztrak:BLD2026-0001",
    "automated": true,
    "signalFactors": {
      "directMatches": 1,
      "materialSignals": 1,
      "projectContext": 0,
      "intentSignals": 1,
      "excluded": 0
    }
  }
}
```

### Retired Zap template

Kept only so old emails are recognizable. Zapier is not in the path. See `docs/RETIRED-zapier.md`.

The old 2-step Zap used namespace `357570886`:

**Subject:**
```
Lead: {{357570886__source}} | {{357570886__metadata__routeId}} | {{357570886__submittedAt}}
```

**Body (plain text):**
```
Name: {{357570886__lead__name}}
Email: {{357570886__lead__email}}
Phone: {{357570886__lead__phone}}
URL: {{357570886__lead__externalPostUrl}}
Request ID: {{357570886__requestId}}
Dedupe Key: {{357570886__dedupeKey}}

Details:
{{357570886__lead__projectDetails}}
```

## Logs

**Poll run summary:**
```
lead-sourcer/runs/poll-runs.jsonl
```

Each line is a JSON summary: `{ startedAt, completedAt, mode, counts, verdicts, sourceStatuses, errors }`

**Live run output:**
```bash
npm run sourcer -- --mode=live 2>&1 | tee /tmp/lead-sourcer-run-$(date +%Y%m%d-%H%M%S).log
```

## Testing

```bash
npm run sourcer:check
npm test -- --runInBand
```

- `tests/permits.test.js`, `tests/permits-accela.test.js` — Permit sources
- `tests/run-report.test.js` — Run report (live sources only, Hamilton first)
- `tests/lead-email.test.js` — Lead notification email
- `tests/dedup.test.js` — Dedup store behavior
- `tests/payload.test.js` — Lead payload shape and helpers
- `tests/field-mapping.test.js` — Zap field extraction

## Delivery Guarantees

- **Resend** is the only channel.
  - Success → email sent to the internal sales inbox
  - Failure → the lead is not marked seen and is retried next run

## Run Reports

After each poll cycle (live mode only), a run-report email is sent summarizing:
- Live sources first (Hamilton County, Cincinnati, Butler County) with status and fetched/matched/emailed
- Top leads (no contact details)
- Counts: fetched, evaluated, matched, rejected, relayed per source
- Any errors encountered
- Duration and timestamp

Report email goes out when the poll found a lead or a source is unhealthy, and once on Friday at the 5:07 PM ET run even if both are quiet. Set `LEAD_SOURCER_SEND_RUN_REPORT=false` to turn reports off.

## Troubleshooting

### Old "Webhook relay failed: 404"
- Ignore it. The Zapier hook was retired on 2026-10-30. Delete any leftover `LEAD_WEBHOOK_URL` secret. Do not regenerate the hook.

### "missing_resend_api_key"
- `RESEND_API_KEY` not in effective environment. Check `.env`, `.env.local`, `.vercel/.env.production.local`.

### No leads found
- Check the permit sources are enabled: `LEAD_SOURCER_ENABLE_PERMITS_HAMILTON=true` etc.
- Check keyword config (`LEAD_SOURCER_PERMITS_KEYWORDS`, `LEAD_SOURCER_ACCELA_TYPE_KEYWORDS`).

### Leads not relayed
- Check `RESEND_API_KEY` is set. The webhook is retired.
- Dry mode does not relay; use `LEAD_SOURCER_MODE=live`.
- Check run logs at `runs/poll-runs.jsonl` for relay status per source.

## Version

Lead Sourcer v1.0
