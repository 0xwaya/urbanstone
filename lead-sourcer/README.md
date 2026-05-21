# Lead Sourcer

Automated lead sourcing and delivery pipeline for Urban Stone. Scrapes Reddit, Craigslist, and Apify sources for qualified contractor leads, scores them, and delivers via email.

## Architecture

### Polling
- **Reddit:** r/Renovation, r/Remodeling, r/Homeimprovement (configurable via env)
- **Craigslist:** Multi-region searches for contractor and countertop keywords
- **Apify:** Facebook Groups scraper (configurable task)

### Scoring
- Material signals (granite, quartz, marble, etc.)
- Direct match keywords (countertop, kitchen, renovation)
- Project context (budget, timeline mentions)
- Intent signals (planning, looking, considering)
- Exclusion filters (spam, scams, unqualified)

### Delivery (Dual Channel)
1. **Primary:** Direct email via Resend API → `sales@urbanstone.co`
   - Reliable, no plan limits, independent of external services
   - No Zap dependencies or cost constraints
2. **Secondary:** Webhook to Zap → Email via Microsoft Outlook
   - Optional integration for redundancy
   - Non-blocking; primary delivery succeeds even if webhook fails
   - Simple 2-step Zap: Catch Hook → Send Email

## Setup

### Environment Variables

**Required:**
```
RESEND_API_KEY=...                 # Direct email delivery
LEAD_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/27076432/4ypc0n3/  # Zap webhook
```

**Optional (defaults shown):**
```
LEAD_SOURCER_ENABLE_REDDIT=true
LEAD_SOURCER_ENABLE_CRAIGSLIST=true
LEAD_SOURCER_ENABLE_APIFY=true
LEAD_SOURCER_SKIP_DEDUP=false      # Set true to bypass dedup (test mode)
LEAD_SOURCER_ALERT_EMAIL=sales@urbanstone.co  # Lead alert recipient
LEAD_SOURCER_RUN_REPORT_EMAIL=sales@urbanstone.co  # Run report recipient
LEAD_SOURCER_SEND_RUN_REPORT=true  # Always send report, even with 0 matches
LEAD_SOURCER_ZAP_FIELD_NAMESPACE=357570886  # Zap field prefix
```

Files: `.env`, `.env.local`, `.vercel/.env.production.local`

### Installation

```bash
cd lead-sourcer
npm install
```

### Running

**One-shot live run:**
```bash
LEAD_SOURCER_MODE=live node src/index.js
```

**One-shot dry run (no relay):**
```bash
LEAD_SOURCER_MODE=dry node src/index.js
```

**Skip dedup (test mode, allow repeated leads):**
```bash
LEAD_SOURCER_MODE=live LEAD_SOURCER_SKIP_DEDUP=true node src/index.js
```

**Interval polling (configurable minutes):**
```bash
LEAD_SOURCER_INTERVAL_MINUTES=60 node src/index.js  # Run every 60 min
```

### Cron Integration

See [scripts/run_lead_sourcer_cron.sh](scripts/run_lead_sourcer_cron.sh) for wrapper script that sources env files and handles working directory context.

## Payload Format

Leads are sent as JSON to both Resend and the Zap webhook:

```json
{
  "submittedAt": "2026-05-14T14:47:53.801Z",
  "source": "reddit",
  "requestId": "lead-sourcer/reddit/post-123",
  "dedupeKey": "post-123",
  "verdict": "match",
  "score": 78,
  "scoreBand": "warm",
  "hasAnchor": true,
  "lead": {
    "name": "Username",
    "email": "auto+username@urbanstone.co",
    "phone": "+1-000-000-xxxx",
    "projectDetails": "[REDDIT MATCH]\n\nTitle: ...\n\nPost URL: ...",
    "externalPostId": "post-123",
    "externalPostUrl": "https://reddit.com/..."
  },
  "metadata": {
    "routeId": "lead-sourcer/reddit",
    "scoreBand": "warm",
    "score": 78,
    "verdict": "match",
    "dedupeKey": "post-123",
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

### Zap Email Template

The 2-step Zap uses namespace `357570886` for field extraction:

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
/Users/pc/.openclaw/workspace/urbanstone/lead-sourcer/runs/poll-runs.jsonl
```

Each line is a JSON summary: `{ startedAt, completedAt, mode, counts, verdicts, errors }`

**Live run output:**
```bash
LEAD_SOURCER_MODE=live node src/index.js 2>&1 | tee /tmp/lead-sourcer-run-$(date +%Y%m%d-%H%M%S).log
```

## Testing

```bash
npm test -- --runInBand
```

- `tests/matcher.test.js` — Scoring logic validation
- `tests/dedup.test.js` — Dedup store behavior
- `tests/payload.test.js` — Lead payload shape and helpers
- `tests/field-mapping.test.js` — Zap field extraction

## Delivery Guarantees

- **Resend:** Primary path, always attempted first
  - Success → Email sent directly
  - Failure → Logs error, continues to webhook
- **Webhook (Zap):** Secondary path, non-blocking
  - Success (200) → Logs "Webhook sent"
  - Failure (404, 5xx, timeout) → Logs warning, does not block final result
- **Final status:** "delivered" if either channel succeeds; error only if both fail

## Run Reports

After each poll cycle (live mode only), a run-report email is sent summarizing:
- Total matches found (reddit, craigslist, apify)
- Counts: fetched, evaluated, matched, rejected, relayed per source
- Any errors encountered
- Duration and timestamp

Report is always sent, even if zero matches found (configurable via `LEAD_SOURCER_SEND_RUN_REPORT`).

## Troubleshooting

### "Webhook relay failed: 404 please unsubscribe me!"
- Old Zap webhook was 404. New URL is `4ypc0n3/`. Check `LEAD_WEBHOOK_URL` in env.
- Resend primary still succeeds; Zap failure is non-blocking.

### "missing_resend_api_key"
- `RESEND_API_KEY` not in effective environment. Check `.env`, `.env.local`, `.vercel/.env.production.local`.

### No leads found
- Check Reddit/Craigslist/Apify are enabled: `LEAD_SOURCER_ENABLE_REDDIT=true` etc.
- Check scoring thresholds and keyword config in source files.
- Try `LEAD_SOURCER_SKIP_DEDUP=true` to test without dedup filtering.

### Leads not relayed
- Check `LEAD_WEBHOOK_URL` and `RESEND_API_KEY` are set.
- Dry mode does not relay; use `LEAD_SOURCER_MODE=live`.
- Check run logs at `runs/poll-runs.jsonl` for relay status per source.

## Version

Lead Sourcer v1.0
