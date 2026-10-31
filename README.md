# Urban Stone

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Status: Source Snapshot](https://img.shields.io/badge/status-source%20snapshot-orange.svg)](#current-status)
[![Security Policy](https://img.shields.io/badge/security-policy-brightgreen.svg)](SECURITY.md)
[![Stack: Next.js](https://img.shields.io/badge/stack-Next.js-black.svg)](#project-layout)
[![Scraper: Node.js](https://img.shields.io/badge/scraper-Node.js-339933.svg)](#project-layout)

Public source repository for the Urban Stone Collective website, supplier content, and lead-sourcing automation.

## Overview

This repository contains the Urban Stone Collective project and its lead-sourcing automation. It keeps the deployable site, supplier tooling, and operational documentation together without unrelated workspace history.

The recovered project includes:

- the Urban Stone Collective marketing site
- a supplier scraper prototype for featured stone data
- a lead-sourcer utility that emails matched permit leads to sales@ (Zapier retired 2026-10-30)
- brand assets and countertop material imagery that were already committed in the source tree
- architecture and upgrade notes for future backend and automation work

## Safe Migration

This public repository was migrated with a safety-first protocol:

- only the committed Urban Stone project subtree was retained
- unrelated monorepo history was not pushed
- generated scraper output was removed from tracked source
- obvious secret patterns were scanned before publish
- environment files, local caches, build artifacts, and editor noise are ignored by default

See MIGRATION_NOTES.md for the migration boundary and follow-up guidance.

## Current Status

The production site is [urbanstone.co](https://urbanstone.co). Secrets for that deployment live in the host environment and are not in this tree. `LEAD_WEBHOOK_URL` is retired and should be deleted wherever it remains. The list below still describes the public snapshot. Treat a gap as closed only when the deployment actually has it.

The lead-sourcer runs unattended at 8:00, 12:00, and 5:00 ET. The scheduled job is in live mode and delivers matched leads to the sales inbox. It does not contact the people who posted. Onyx, the site chat, calls Ollama when that runtime is available and falls back to the on-site knowledge base if it is not. Social images committed in this repo are assets only. This repository does not post them.

This repository now includes a runnable standalone frontend baseline, but the snapshot itself still needs a configured lead-delivery destination and operational ownership before a fresh clone should be treated as production.

What is present:

- the primary landing page entry under `frontend/pages/index.jsx`
- a standalone `frontend/package.json` and generated lockfile for the site
- reusable marketing components for navigation, feature highlights, lead capture, hero, and supplier sections
- a gated contractor portal with magic-link login, session cookie protection, and Supabase-backed access control
- a trimmed contractor pricing page with expandable material cards and direct sales contact actions
- static brand and supplier material assets
- the supplier scraper prototype and source list
- Tailwind, ESLint, Vitest, Docker, and GitHub Actions CI for the frontend
- baseline runtime hardening for the site and lead endpoint, including security headers, same-origin checks, payload validation, a honeypot, and rate limiting

What is still missing or incomplete:

- a customer tracker. Leads already email sales@ via Resend. Zapier is retired. See `lead-sourcer/docs/RETIRED-zapier.md`.
- production env configuration for contractor access and mail delivery (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTRACTOR_SESSION_SECRET`, `CONTRACTOR_ADMIN_EMAILS`, optional `CONTRACTOR_APPROVED_EMAILS`, `RESEND_API_KEY`)
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
4. set `RESEND_API_KEY` so quote requests email sales@
5. `npm run dev`

Contractor portal setup:

- protected route: `/contractors`
- public gate: `/contractors/login`
- admins listed in `CONTRACTOR_ADMIN_EMAILS` can request a magic link without manual approval
- pre-vetted contractors can be listed in `CONTRACTOR_APPROVED_EMAILS`
- all other contractor applicants are inserted into Supabase with `approved=false` until manually approved
- direct contractor inquiries now route to email/text from inside the portal instead of the residential estimate form
- contractor pricing email preview can be sent with `npm run contractor:email:preview`

Homepage and projects (Oct 2026):

- homepage order: hero, fall offer, What we do (services), Recent projects (rotating gallery), materials + estimate form, contractor partner section, FAQ, reviews
- `/projects` and `/es/projects` show every real job photo, grouped by job; add new ones with `npm run projects:add` and `frontend/data/projects.js` (see `frontend/README.md`, "Projects Gallery")
- no client names, street addresses or listing links on project pages

The frontend now includes a mobile-spacing pass for the live landing page, including the quote card, hero layout, and supplier browsing flow.

Recent supplier-browser updates in the frontend include:

- compact supplier cards that keep the homepage focused on Urban Stone as the primary contact
- curated slab previews lazy-loaded behind supplier-specific shortlist actions
- collapsible location and hours controls with a tighter single-card mobile layout
- section-level handoff copy and CTA blocks that route visitors back to estimate and contact actions
- softened supplier logo treatments and tighter card styling so the materials library stays inside the main brand system
- extra anchor scroll offset and lighter sticky-header padding for cleaner mobile jumps into the materials section
- contractor portal entry moved off the homepage body and into the mobile hamburger menu plus footer CTAs
- contractor pricing now uses compact expandable material previews for faster visual scanning

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
- the contractor portal depends on a working Supabase project and Resend key in production; without those env vars, registration and magic-link delivery will not function

For Vercel, the cleanest setup is to set the project Root Directory to `frontend` in the dashboard because that is where the Next.js app and lockfile live.

Lead webhook payload note:

- `frontend/pages/api/lead.js` now forwards correlation metadata for downstream automation and debugging.
- `metadata.requestId` is propagated from inbound `x-request-id` when available, otherwise generated server-side.
- `metadata.dedupeKey` is generated as a deterministic hash from normalized lead fields so Zapier/Storage duplicate suppression can use a stable key.

### Zapier (retired 2026-10-30)

The old Catch Hook zap (id `357570886`) is not in the path. Website forms and the lead sourcer email sales@ through Resend. Do not recreate the hook. Details: `lead-sourcer/docs/RETIRED-zapier.md`.

The in-memory dedupe in `frontend/pages/api/lead.js` still suppresses a repeat submission from the same browser session. It is not a database.

### Supplier Scraper

The supplier scraper is a small Node.js prototype using Cheerio.

Typical workflow:

1. install dependencies in `supplier-scraper`
2. run the scraper locally
3. review results manually before publishing any supplier-derived content

Do not commit generated scraper output unless it is intentionally reviewed and treated as a versioned artifact.

### Lead Sourcer

The lead sourcer is a standalone Node.js utility under `lead-sourcer`. The live job checks Cincinnati, Hamilton County, and Butler County permits and emails matches to sales@. Reddit, Craigslist, and Facebook are off.

Manual workflow:

1. `cd lead-sourcer`
2. create `lead-sourcer/.env` with `RESEND_API_KEY=...` for a live run
3. add source integration env entries:

- required for live email: `RESEND_API_KEY=...`
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
- `LEAD_SOURCER_TRACING_ENABLED` (default: `true`) — enable OpenTelemetry tracing export
- `LEAD_SOURCER_OTEL_SERVICE_NAME` (default: `lead-sourcer`) — service name in traces
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` (default: `http://localhost:4318/v1/traces`) — OTLP HTTP traces endpoint

Examples:

- one-shot (default): `npm run run`
- every 15 minutes: `LEAD_SOURCER_INTERVAL_MINUTES=15 npm run run`
- every 15 minutes, stop after 8 cycles: `LEAD_SOURCER_INTERVAL_MINUTES=15 LEAD_SOURCER_MAX_CYCLES=8 npm run run`

Monitoring script:

- `npm run summary:daily` — prints last-window run totals and zero-match streak from `runs/poll-runs.jsonl`
- exits with code `2` when zero-match streak meets `LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD`
- `npm run summary:weekly-tuning` — summarizes near-miss/review queues for threshold tuning
- set `LEAD_SOURCER_TUNING_WINDOW_DAYS` (default `7`) to tune the weekly summary window

Tracing:

- open the local collector/viewer in VS Code with command `AI Toolkit: Open Trace Viewer`
- run `bash lead-sourcer/run.sh` (or existing npm scripts) and traces are emitted automatically
- set `LEAD_SOURCER_TRACING_ENABLED=false` to disable tracing for a run

Run modes (set via `--mode=` CLI flag or `LEAD_SOURCER_MODE` env var):

- `live` (default): relay matches + persist seen IDs
- `dry-run`: classify and log without relaying or persisting
- `review-only`: persist seen IDs and log borderline candidates to `runs/review-candidates.jsonl`, no relay

Classification verdicts:

- `match`: direct keyword + intent signal — relayed in live mode
- `borderline`: material/context signal without clear intent — logged to `runs/review-candidates.jsonl`; can also relay in live mode when recall-first controls are enabled
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
  - `APIFY_OVERRIDE_TASK_INPUT=true|false` (default: `false`)
    - `false` (recommended): uses saved input from each Apify task in Apify Console
    - `true`: forces runtime overrides from `APIFY_*_TASK_INPUT` JSON env values
  - `APIFY_TASK_TIMEOUT_MS` (default: `120000`)
  - `APIFY_TASK_DELAY_MS` (default: `1200`)
  - common troubleshooting:
    - if logs show `fetched > 0` and `skippedSeen == fetched`, the task is returning previously seen posts (dedupe is working as designed)
    - if Facebook task output looks unrelated (example: `humansofnewyork`), reconfigure the Apify task `startUrls` in Apify Console
    - if Nextdoor returns zero items repeatedly, validate task `locations` in Apify Console and account/session health
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
- recall-first relay controls:
  - `LEAD_SOURCER_RELAY_BORDERLINE=true|false` (default: `true`)
  - `LEAD_SOURCER_BORDERLINE_RELAY_MIN_SCORE=35` (default: `35`)
  - use these to relay higher-signal borderline candidates while preserving manual review logs
- automated relays include `lead.externalPostId`, `lead.externalPostUrl`, and enriched metadata for Zap triage: `metadata.automated=true`, `metadata.dedupeKey`, `metadata.requestId`, `metadata.verdict`, `metadata.score`, `metadata.scoreBand`, `metadata.hasAnchor`, and `metadata.signalFactors`

Current runtime state (April 10, 2026):

- lead-sourcer tests are passing (`35/35`)
- OpenTelemetry tracing is integrated in `lead-sourcer/src/tracing.js` and initialized at startup from `lead-sourcer/src/index.js`
- tracing default endpoint is `http://localhost:4318/v1/traces` and works with AI Toolkit Trace Viewer
- run-report payloads now include both plain text (`lead.projectDetails`) and HTML (`lead.htmlReport`) so downstream automation can render a chart-style digest email
- live runs continue to relay run reports successfully (`HTTP 200`) even on zero-match cycles
- current no-individual-email behavior is still expected when recent cycles classify `0 match` leads (dedupe and filters working as designed)

Safe-stop update (April 10, 2026):

- recall-first backend changes remain active on `main` (commit: `c113503`)
- tracing dependencies were added to `lead-sourcer/package.json` and lockfile for reproducible local runs
- a tracing bootstrap smoke test completed successfully and logs: `OpenTelemetry enabled (service=lead-sourcer, endpoint=http://localhost:4318/v1/traces)`
- run-report relay remains healthy with `HTTP 200` responses after recent reporting-format updates

Vercel cron integration (every 4 hours):

- `frontend/vercel.json` schedules `0 */4 * * *` for `/api/cron/lead-sourcer`
- `frontend/pages/api/cron/lead-sourcer.js` is a secure trigger endpoint
- required Vercel env vars:
  - `CRON_SECRET` (Vercel cron auth)
  - `LEAD_SOURCER_TRIGGER_URL` (your runner endpoint that actually executes `lead-sourcer`)
- optional Vercel env var:
  - `LEAD_SOURCER_TRIGGER_SECRET` (bearer token sent to runner endpoint)

Next session pickup checklist:

1. Trigger one additional automated test with `metadata.scoreBand=tepid` to verify Path B end-to-end.
2. Validate duplicate suppression by sending the same `metadata.dedupeKey` twice and confirming second send is blocked.
3. Run one normal live cycle and inspect Zap run history distribution across Path A, Path B, and fallback.
4. If fallback share is high, inspect incoming webhook samples and tighten path predicates only after confirming field presence.

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
