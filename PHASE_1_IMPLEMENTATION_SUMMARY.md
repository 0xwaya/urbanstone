# Phase 1 Implementation Summary - Live Backend Validation

Date: April 4, 2026
Status: Production Ready
Zap ID: 357570886

## Executive Summary

Phase 1 backend is functional and stable:

- Classifier fix is live (material-anchored countertop posts can classify as match).
- Pollers run end-to-end (Reddit, Craigslist, optional Apify).
- Zap integration contract remains valid for automated and website paths.
- Runtime hardening updates were applied to remove a live-run crash edge case.

## Source Architecture (Authoritative)

- Core sources: Reddit + Craigslist
- Optional expansion: Apify
- Apify scope: Facebook Groups + Nextdoor scraping

This matches the current operational model and Zap intake rules.

## Zap Structural Alignment (v1.1)

Current payload and filters align with Zap flow:

1. Webhook trigger accepts:
   - source
   - lead.* fields
   - metadata.* fields (including automated, dedupeKey, routeId, requestId)
2. Intake filter passes either:
   - website lead with email + phone, or
   - automated lead where metadata.automated = true
3. Storage dedup key pattern:
   - dedup::{{metadata.dedupeKey}}
4. Duplicate suppression gate blocks already-seen dedupe keys
5. Outlook send step executes only for intake-pass + dedupe-pass events

## Backend Hardening Applied (This Push)

### 1) Auto-load .env for runtime commands

Problem:
- .env existed but could be missed unless explicitly exported in shell commands.

Fix:
- Added dotenv auto-loading to executable entrypoints:
  - lead-sourcer/src/index.js
  - lead-sourcer/src/reddit.js
  - lead-sourcer/src/craigslist.js
  - lead-sourcer/src/apify.js

Result:
- LEAD_WEBHOOK_URL and APIFY_* env vars are available consistently when launching via npm/node.

### 2) Fixed runOnce crash when a poller returns array shape

Problem:
- Live run could crash with:
  - TypeError: Cannot read properties of undefined (reading 'length')
- Trigger: skip paths where a poller returned [] instead of { matches, stats }.

Fix:
- Added result normalization in lead-sourcer/src/index.js before counting matches.
- All poller outputs are normalized to:
  - { matches: [], stats: {} } shape.

Result:
- Live polling now completes and writes run summaries even when a source is skipped.

## Apify Task ID Support

Lead-sourcer accepts these env key variants for task IDs:

Nextdoor:
- APIFY_NEXTDOOR_TASK_ID
- APIFY_TASK_ID_NEXTDOOR
- APIFY_NEXTDOOR_ID
- NEXTDOOR_TASK_ID

Facebook Groups:
- APIFY_FACEBOOK_TASK_ID
- APIFY_FACEBOOK_GROUPS_TASK_ID
- APIFY_TASK_ID_FACEBOOK
- FACEBOOK_TASK_ID

Ad Library (optional):
- APIFY_AD_LIBRARY_TASK_ID
- APIFY_FACEBOOK_AD_LIBRARY_TASK_ID
- APIFY_TASK_ID_AD_LIBRARY
- AD_LIBRARY_TASK_ID

## Live Validation Results

### Regression tests
- 34/34 passing

### Live run behavior
- Full live runs now complete without the previous TypeError crash.
- Latest run summaries were appended to runs/poll-runs.jsonl successfully.
- Recent sample runs produced zero matches in that window:
  - fetched volumes were high
  - candidates evaluated/rejected
  - no relay sends in those specific windows

Interpretation:
- Backend execution path is healthy.
- Low yield in recent windows is content/market-window dependent, not a pipeline crash.

## Operational Notes

- If match yield is temporarily low, keep schedule running for continuous coverage.
- For higher capture aggressiveness, operator can run with:
  - LEAD_SOURCER_REQUIRE_REGIONAL_SIGNAL=false
- Zap dedupe remains active and suppresses duplicate notifications by metadata.dedupeKey.

## Files Updated in This Cycle

- lead-sourcer/src/index.js
- lead-sourcer/src/reddit.js
- lead-sourcer/src/craigslist.js
- lead-sourcer/src/apify.js
- lead-sourcer/package.json
- lead-sourcer/package-lock.json
- PHASE_1_IMPLEMENTATION_SUMMARY.md

## Final Status

Backend is stable, documented, and ready for continued live polling.
