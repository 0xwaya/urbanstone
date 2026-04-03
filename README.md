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

### Supplier Scraper

The supplier scraper is a small Node.js prototype using Cheerio.

Typical workflow:

1. install dependencies in `supplier-scraper`
2. run the scraper locally
3. review results manually before publishing any supplier-derived content

Do not commit generated scraper output unless it is intentionally reviewed and treated as a versioned artifact.

### Lead Sourcer

The lead sourcer is a standalone Node.js utility under `lead-sourcer` that polls Reddit and Craigslist, filters posts against countertop and remodel keywords, deduplicates matches, and relays qualified leads to the configured webhook.

Manual workflow:

1. `cd lead-sourcer`
2. create `lead-sourcer/.env` with `LEAD_WEBHOOK_URL=...`
3. `npm install`
4. `npm run run`

You can also invoke the wrapper directly with `bash lead-sourcer/run.sh` from the repository root.

Operational notes:

- `lead-sourcer/run.sh` is the saved entrypoint for manual runs and any future scheduler wiring
- `lead-sourcer/.env` and `lead-sourcer/seen-ids.json` are intentionally gitignored runtime files
- the current poller is intended for manual execution until the OpenClaw gateway issue is resolved
- Craigslist may return `403` for some feed requests, so Reddit is currently the more reliable source

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
