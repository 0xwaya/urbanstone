# Phase 1 Activation Guide - Lead Sniffer Live (April 4, 2026)

## Status: READY FOR PRODUCTION

## What Is Live Now

- Reddit and Craigslist pollers are active now.
- Classifier fix is shipped (material-anchored posts classify as `match`).
- Zapier webhook relay is configured via `LEAD_WEBHOOK_URL`.
- Test suite is green (34 passing tests).

## Source Architecture (Important)

- Core Phase 1 sources: Reddit + Craigslist.
- Apify is optional expansion only.
- Apify is dedicated to Facebook Groups + Nextdoor scraping.
- If `APIFY_TOKEN` is not set, Apify is skipped and core sources still run.

## Activation Checklist

### Step 1: Verify Core Sources (No Extra Setup)

Run:

```bash
cd lead-sourcer && npm start
```

Expected log signals:

- `[reddit] ... fetched ...`
- `[craigslist] ... found ...`
- `Match in ...`

If those appear, Phase 1 core sourcing is working.

### Step 2 (Optional): Enable Apify for Facebook + Nextdoor

Edit `lead-sourcer/.env` and add:

```bash
APIFY_TOKEN=apify_<your_secret_token>
APIFY_NEXTDOOR_TASK_ID=<your_nextdoor_task_id>
APIFY_FACEBOOK_TASK_ID=<your_facebook_task_id>
APIFY_ENABLE_NEXTDOOR=true
APIFY_ENABLE_FACEBOOK=true
APIFY_ENABLE_AD_LIBRARY=false
```

Notes:

- This only enables Facebook/Nextdoor sources.
- Reddit/Craigslist are unaffected and continue running.

### Step 3: Schedule Polling

Recommended cron:

```bash
*/12 * * * * cd /path/to/lead-sourcer && npm start >> logs/poller.log 2>&1
```

### Step 4: Monitor Zapier

- Confirm Zap task runs succeed.
- Confirm Outlook receives lead emails.
- If no emails, check `LEAD_WEBHOOK_URL` and Zap task logs.

Run report behavior:

- Every completed `live` poll cycle now sends a run-summary payload through the same webhook.
- This includes zero-match runs, so operations always get a heartbeat report.
- Disable only if needed: set `LEAD_SOURCER_SEND_RUN_REPORT=false`.
- Optional streak warning: set `LEAD_SOURCER_ZERO_MATCH_ALERT_THRESHOLD=<n>` to warn after `n` consecutive zero-match cycles.

## Volume Expectations

- Core (Reddit + Craigslist): ~40-80 leads/month.
- Optional Apify (Facebook + Nextdoor): +10-40 leads/week depending on task quality and coverage.

## Quick Troubleshooting

- `APIFY_TOKEN not set`: expected if Apify expansion is not enabled.
- No `Match in` logs: inspect `runs/review-candidates.jsonl` and classifier signals.
- No Zap deliveries: verify `LEAD_WEBHOOK_URL` and Zap history.

Near-miss review queue (new):

- A second queue now logs non-match but promising posts to `lead-sourcer/runs/near-miss-candidates.jsonl`.
- Soft score threshold env: `LEAD_SOURCER_NEAR_MISS_SCORE_THRESHOLD` (default `45`).
- Weekly tuning loop:
  - Review near-miss rows and mark converted/not-converted.
  - Tighten or loosen score threshold and source keyword filters accordingly.
  - Keep hard match relay logic unchanged for safety.

Weekly tuning command:

```bash
cd lead-sourcer && npm run summary:weekly-tuning
```

Optional window override:

```bash
LEAD_SOURCER_TUNING_WINDOW_DAYS=14 npm run summary:weekly-tuning
```

One-time first-run recency expansion (Reddit):

- First run can evaluate up to 14 days of posts one time, then auto-falls back to 48h.
- Marker file: `lead-sourcer/runs/reddit-first-run-window-used.flag`.
- Controls:
  - `LEAD_SOURCER_FIRST_RUN_EXTENDED_WINDOW=true|false` (default `true`)
  - `LEAD_SOURCER_FIRST_RUN_MAX_POST_AGE_HOURS=336` (default 14 days)
  - `LEAD_SOURCER_FIRST_RUN_MARKER_FILE=/custom/path.flag` (optional)
- To intentionally rerun the one-time extended pass, delete the marker file and run a new `live` cycle.

## Rollback

- Stop scheduler.
- Revert classifier commit if needed.
- Keep `seen-ids.json` to prevent duplicate re-sends.

## Current Position

- Phase 1 core pipeline is production-ready and active.
- Apify remains an optional Facebook/Nextdoor extension.
