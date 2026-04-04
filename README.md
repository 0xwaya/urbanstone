# Amazon Granite

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Status: Source Snapshot](https://img.shields.io/badge/status-source%20snapshot-orange.svg)](#current-status)
[![Security Policy](https://img.shields.io/badge/security-policy-brightgreen.svg)](SECURITY.md)
[![Stack: Next.js](https://img.shields.io/badge/stack-Next.js-black.svg)](#project-layout)
[![Scraper: Node.js](https://img.shields.io/badge/scraper-Node.js-339933.svg)](#project-layout)

Public source repository for the Amazon Granite rebrand and supplier-content prototype.

## Overview

This repository preserves a clean, public-safe snapshot of the Amazon Granite project extracted from a larger private workspace. The migration intentionally keeps only Amazon Granite source artifacts and excludes unrelated repository history.

The recovered project includes:

- a marketing site prototype for Amazon Granite LLC
- a supplier scraper prototype for featured stone data
- a lead-sourcer utility for polling public sources and relaying matched leads through the existing webhook flow
- brand assets and countertop material imagery that were already committed in the source tree
- architecture and upgrade notes for future backend and automation work

## Safe Migration

This public repository was migrated with a safety-first protocol:

- only the committed Amazon Granite subtree was exported
- unrelated monorepo history was not pushed
- generated scraper output was removed from tracked source
- obvious secret patterns were scanned before publish
- environment files, local caches, build artifacts, and editor noise are ignored by default

See MIGRATION_NOTES.md for the migration boundary and follow-up guidance.

## Current Status

This repository now includes a runnable standalone frontend baseline, but it still needs a real lead-delivery destination and fuller operational rollout before it should be treated as a finished production property.

What is present:

- the primary landing page entry under `frontend/pages/index.jsx`
- a standalone `frontend/package.json` and generated lockfile for the site
- reusable marketing components for navigation, feature highlights, lead capture, hero, and supplier sections
- static brand and supplier material assets
- the supplier scraper prototype and source list
- Tailwind, ESLint, Vitest, Docker, and GitHub Actions CI for the frontend
- baseline runtime hardening for the site and lead endpoint, including security headers, same-origin checks, payload validation, a honeypot, and rate limiting

What is still missing or incomplete:

- a real CRM, email, or webhook destination behind `LEAD_WEBHOOK_URL`
- image optimization work if you want to replace the current flexible `img` usage with `next/image`
- broader production concerns such as analytics, uptime monitoring, content workflow, and end-to-end browser tests

That means the repository is now suitable for local development, CI validation, and staged deployment prep, but it still should not be presented as a finished production application until lead delivery and operational ownership are wired through.

## Project Layout

```text
frontend/
  components/
  data/
  pages/
  public/
lead-sourcer/
supplier-scraper/
DB-API-Outline.md
upgrade_plan.md
```

## Security

Basic repository hygiene already applied:

- secret-pattern scan completed before migration
- generated output removed from tracked source
- repo-level ignore rules added for env files, logs, and build artifacts
- public disclosure guidance documented in SECURITY.md

If you discover a security issue or accidental sensitive disclosure, follow SECURITY.md instead of opening a public issue.

## Working With The Snapshot

### Frontend

The frontend is now a standalone Next.js pages app with Tailwind, tests, CI, and a hardened lead intake route.

Local workflow:

1. `cd frontend`
2. `npm install`
3. `cp .env.example .env.local`
4. set `LEAD_WEBHOOK_URL` to the system that should receive quote requests
5. `npm run dev`

The frontend now includes a mobile-spacing pass for the live landing page, including the quote card, hero layout, and supplier browsing flow.

Recent supplier-browser updates in the frontend include:

- compact supplier cards that keep the homepage focused on Urban Stone as the primary contact
- curated slab previews lazy-loaded behind supplier-specific shortlist actions
- collapsible hours-of-operation controls for supplier metadata
- section-level handoff copy and CTA blocks that route visitors back to estimate and contact actions
- softened supplier logo treatments and tighter card styling so the materials library stays inside the main brand system
- extra anchor scroll offset and lighter sticky-header padding for cleaner mobile jumps into the materials section

Quality gates:

1. `npm run lint`
2. `npm run test`
3. `npm run build`

Deployment options currently included:

1. GitHub Actions CI via `.github/workflows/frontend-ci.yml`
2. container deployment via `frontend/Dockerfile`
3. standalone Next.js output for process-based hosting

Production note:

- the standalone Next.js server requires `sharp` to be installed because the site uses Next image optimization in production
- if you deploy on Vercel, keep the project Root Directory set to `frontend`
- if you deploy via a process manager, run the install in `frontend`, build there, and start with `node .next/standalone/server.js` from that same directory so the standalone server can resolve its runtime dependencies

For Vercel, the cleanest setup is to set the project Root Directory to `frontend` in the dashboard because that is where the Next.js app and lockfile live.

Lead webhook payload note:

- `frontend/pages/api/lead.js` now forwards correlation metadata for downstream automation and debugging.
- `metadata.requestId` is propagated from inbound `x-request-id` when available, otherwise generated server-side.
- `metadata.dedupeKey` is generated as a deterministic hash from normalized lead fields so Zapier/Storage duplicate suppression can use a stable key.

### Zapier Pipeline

Urban Stone production lead intake zap is published and live with the following configuration:

- Zap ID: `357570886`
- Architecture: 7-step dedup suppression + email routing

The Zapier zap that receives leads from the webhook and forwards them to Outlook uses this step order:

|Step|App|Purpose|
|---|---|---|
|1|Webhooks by Zapier — Catch Hook|Receives the inbound lead payload|
|2|Filter by Zapier|Intake gate: continue only if (`email` + `phone`) OR (`metadata.automated = true`)|
|3|Storage by Zapier — Get Value|Initial dedup read on the `urban-stone-dedupe` key|
|4|Storage by Zapier — Get Value|Resolve the stored value for the dedup key|
|5|Filter by Zapier|Duplicate check: continue only if no dedup value is found|
|6|Storage by Zapier — Set Value|**Write** key `dedup::{{metadata__dedupeKey}}` = `1` to mark lead as processed|
|7|Microsoft Outlook — Send Email|Forward formatted lead to the sales inbox|

**Critical:** Step 6 (Storage Set Value) must come before Outlook. Without it, the filter at Step 5 passes every submission because the key is never written — making Zapier-side dedup non-functional.

Storage key pattern: `dedup::{{357570886__metadata__dedupeKey}}`

Dedup behavior: suppresses duplicate email sends for repeated submissions using the same dedupe key (24h window in Zapier configuration).

Payload contract:

- `submittedAt`, `source`
- `lead.{name, email, phone, projectDetails, ...}`
- `metadata.{dedupeKey, automated, routeId, requestId}`

Outlook email subject template: `New Lead — {{source}} — {{name}} ({{routeId}})`

Validation check:

- Send 1 with a new `dedupeKey`: all 7 steps execute and Outlook sends.
- Send 2 with the same `dedupeKey`: flow stops at Step 5 and Outlook is skipped.

Deferred Zapier hardening backlog (optional, for later implementation):

- add a source guard filter before Outlook to suppress internal `wire-test` events
- include `source`, `routeId`, and classifier score (when present) in the Outlook subject/body for triage
- add a low-volume alert path (for example Slack or digest email) when no accepted leads arrive in a configured window
- make dedupe retention/TTL policy explicit in Zapier Storage operations for predictable replay behavior

The code-side dedup guard in `frontend/pages/api/lead.js` provides within-session protection (1-hour TTL, in-memory). The Zapier Storage layer provides persistent cross-session protection.

### Supplier Scraper

The supplier scraper is a small Node.js prototype using Cheerio.

Typical workflow:

1. install dependencies in `supplier-scraper`
2. run the scraper locally
3. review results manually before publishing any supplier-derived content

Do not commit generated scraper output unless it is intentionally reviewed and treated as a versioned artifact.

### Lead Sourcer

The lead sourcer is a standalone Node.js utility under `lead-sourcer` that polls Reddit, Craigslist, and Apify tasks, classifies posts against countertop/remodel intent, deduplicates matches, and relays qualified leads to the configured webhook.

Manual workflow:

1. `cd lead-sourcer`
2. create `lead-sourcer/.env` with `LEAD_WEBHOOK_URL=...`
3. add source integration env entries:

- required: `LEAD_WEBHOOK_URL=...`
- optional Apify: `APIFY_TOKEN=...`
- optional Apify task IDs: `APIFY_NEXTDOOR_TASK_ID=...`, `APIFY_FACEBOOK_TASK_ID=...`, `APIFY_AD_LIBRARY_TASK_ID=...`

1. `npm install`
2. `npm run run`

Direct source runs:

- `npm run poll:reddit`
- `npm run poll:craigslist`
- `npm run poll:apify`
You can also invoke the wrapper directly with `bash lead-sourcer/run.sh` from the repository root.

Each direct poll command now honors `LEAD_SOURCER_MODE` and `--mode=` (for example: `LEAD_SOURCER_MODE=dry-run npm run poll:reddit`).

Scheduler and run-observability controls (implemented in `lead-sourcer/src/index.js`):

- `LEAD_SOURCER_INTERVAL_MINUTES` (default: `0`) — set `>0` to run poll cycles continuously on interval
- `LEAD_SOURCER_MAX_CYCLES` (default: `0`) — optional max cycles in interval mode (`0` = unbounded)
- `LEAD_SOURCER_RUN_LOG_FILE` (default: `lead-sourcer/runs/poll-runs.jsonl`) — JSONL summaries per cycle
- `LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD` (default: `0`) — warn after N consecutive zero-match cycles
- `LEAD_SOURCER_SUMMARY_WINDOW_HOURS` (default: `24`) — reporting window for daily summary script

Examples:

- one-shot (default): `npm run run`
- every 15 minutes: `LEAD_SOURCER_INTERVAL_MINUTES=15 npm run run`
- every 15 minutes, stop after 8 cycles: `LEAD_SOURCER_INTERVAL_MINUTES=15 LEAD_SOURCER_MAX_CYCLES=8 npm run run`

Monitoring script:

- `npm run summary:daily` — prints last-window run totals and zero-match streak from `runs/poll-runs.jsonl`
- exits with code `2` when zero-match streak meets `LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD`
- `npm run summary:weekly-tuning` — summarizes near-miss/review queues for threshold tuning
- set `LEAD_SOURCER_TUNING_WINDOW_DAYS` (default `7`) to tune the weekly summary window

Run modes (set via `--mode=` CLI flag or `LEAD_SOURCER_MODE` env var):

- `live` (default): relay matches + persist seen IDs
- `dry-run`: classify and log without relaying or persisting
- `review-only`: persist seen IDs and log borderline candidates to `runs/review-candidates.jsonl`, no relay

Classification verdicts:

- `match`: direct keyword + intent signal — relayed in live mode
- `borderline`: material or context signal without clear intent — logged to `runs/review-candidates.jsonl` for manual review
- `reject`: excluded noise terms or no relevant signal

Operational notes:

- `lead-sourcer/run.sh` is the saved entrypoint for manual runs and any future scheduler wiring
- `lead-sourcer/.env` and `lead-sourcer/seen-ids.json` are intentionally gitignored runtime files
- the current poller is intended for manual execution until the OpenClaw gateway issue is resolved
- Craigslist RSS returns 403; the poller uses HTML search parsing (`cl-static-search-result`) instead
- Reddit polling combines subreddit `/new` with targeted search queries against r/cincinnati
- geo-aware queries are auto-generated from `frontend/data/service-areas.js` city data at runtime
- filter strength targets material + region combinations including `granite countertops`, `quartz countertops`, and `quartzite countertops`
- Craigslist query volume is capped via `LEAD_SOURCER_CRAIGSLIST_QUERY_LIMIT` (default: 120) to keep runs bounded
- Apify source is enabled when `APIFY_TOKEN` and at least one task ID are present; otherwise it is skipped without failing the run
- Apify stability controls:
  - `APIFY_ENABLE_NEXTDOOR=true|false`
  - `APIFY_ENABLE_FACEBOOK=true|false`
  - `APIFY_ENABLE_AD_LIBRARY=true|false`
  - `APIFY_TASK_TIMEOUT_MS` (default: `120000`)
  - `APIFY_TASK_DELAY_MS` (default: `1200`)
- one-time Reddit recency expansion controls:
  - `LEAD_SOURCER_FIRST_RUN_EXTENDED_WINDOW=true|false` (default: `true`)
  - `LEAD_SOURCER_FIRST_RUN_MAX_POST_AGE_HOURS=336` (default: 14 days)
  - `LEAD_SOURCER_FIRST_RUN_MARKER_FILE=/custom/path.flag` (optional)
- run-report relay control:
  - `LEAD_SOURCER_SEND_RUN_REPORT=true|false` (default: `true`)
  - every live cycle emits a run-report payload (including zero-match cycles)
- Reddit regional gate control:
  - `LEAD_SOURCER_REQUIRE_REGIONAL_SIGNAL=true|false` (default: `true`)
  - set to `false` to allow non-r/cincinnati high-intent matches during growth/tuning windows
- automated relays include `lead.externalPostId`, `lead.externalPostUrl`, `metadata.automated=true`, `metadata.dedupeKey`, and `metadata.requestId` so the Zapier flow can distinguish sourced leads from website submissions and suppress duplicates consistently

Current runtime state (April 3, 2026):

- lead-sourcer unit tests are passing (`34/34`)
- Zapier webhook transport responds `HTTP 200` on controlled wire-test payloads
- Nextdoor and Facebook Groups Apify tasks are configured and fetching items
- Ad Library can be disabled with `APIFY_ENABLE_AD_LIBRARY=false` when Apify account limits cause instability
- current no-email behavior is due to zero `match` verdicts in recent runs, not a broken webhook transport

## Roadmap

Short-term:

- connect the lead endpoint to a production CRM or webhook
- replace placeholder or stale supplier data with reviewed content
- decide whether to keep raw `img` flexibility or move the gallery to `next/image`

Medium-term:

- add structured content management
- define backend and lead-capture architecture
- harden deployment, analytics, and SEO

Long-term:

- production launch with clear operational ownership, CI, and release workflow

## License

This repository is licensed under Apache 2.0. See LICENSE for details.
