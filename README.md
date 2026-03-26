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

This is a source snapshot, not a production-ready deployment.

What is present:
- the primary landing page entry under `frontend/pages/index.jsx`
- reusable marketing components for hero and supplier sections
- static brand and supplier material assets
- the supplier scraper prototype and source list

What is still missing or incomplete:
- a standalone frontend package manifest and lockfile for the site itself
- some shared frontend components referenced by the page entry but not present in the recovered subtree
- deployment configuration, CI, tests, and runtime hardening for production use

That means the repository is suitable for recovery, redesign, and future build-out, but should not be presented as a complete production application yet.

## Project Layout

```text
frontend/
  components/
  data/
  pages/
  public/
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

The frontend currently represents a recovered Next.js-style pages snapshot.

Recommended next steps:
1. add a `frontend/package.json` with explicit framework and tooling versions
2. restore or replace missing shared components
3. add linting, formatting, and a basic CI workflow
4. document local run commands once the app is bootable

### Supplier Scraper

The supplier scraper is a small Node.js prototype using Cheerio.

Typical workflow:
1. install dependencies in `supplier-scraper`
2. run the scraper locally
3. review results manually before publishing any supplier-derived content

Do not commit generated scraper output unless it is intentionally reviewed and treated as a versioned artifact.

## Roadmap

Short-term:
- make the frontend bootable as a standalone project
- restore or redesign missing UI components
- replace placeholder or stale supplier data with reviewed content

Medium-term:
- add structured content management
- define backend and lead-capture architecture
- harden deployment, analytics, and SEO

Long-term:
- production launch with clear operational ownership, CI, and release workflow

## License

This repository is licensed under Apache 2.0. See LICENSE for details.
