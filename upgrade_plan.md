# AmazonGranite Rebranding - Upgrade Plan

## Goal
Build a stone selection scraper for AmazonGranite-Rebranding with accurate images and user interaction; create a comprehensive upgrade plan for the site to integrate multiple autonomous AI agents handling sales, customer service, disclosures, materials expertise, and pricing; leverage Supabase for the database backend; incorporate AI Automation Studio and branding work elements; target completion and installation cycle of 3-5 days post-deposit.

## Plan

1. Scraper Development (Day 1)
- Identify top 4-5 trending/high-selling stone selections from targeted sources.
- Extract stone selection data including accurate pictures.
- Implement frontend interface for clickable images with expansion to larger or full slab views.

2. Database Setup Using Supabase (Day 1-2)
- Design schema for stones, including name, image URLs, stock info, pricing (base + margin), sizes.
- Integrate scraper output into Supabase database with real-time update capability.

3. Upgrade Plan for Autonomous Agents (Day 2-4)
- Sales Chatbot Agent: Handles lead capture, product info, price quotes.
- Customer Service Agent: Manages FAQs, order tracking, troubleshooting.
- Disclosures Agent: Manages liability waivers, terms, and conditions compliance.
- Materials Expert Agent: Provides detailed info on stone properties, slab sizes, pricing strategies, and margin calculations.
- Workflow to generate price list in DB with added margin dynamically.
- Schedule management agent for appointment setting, progress tracking.

4. AI Automation Studio Integration (Day 3-5)
- Automate appointment scheduling.
- Enable B2B pipeline workflow for supplier/customer interaction.
- Micro-SaaS features: user dashboards, notifications.

5. Branding Work (Parallel)
- Midjourney AI exploration for image assets and branding.
- Figma designs for UI/UX overhaul integrating AI enhanced features.

6. Deployment & Testing (Day 4-5)
- Deploy new scraper and database integration.
- Test AI agents in sandboxed environments.
- Monitor end-to-end flow from deposit to installation.

## Risks
- Delays or inaccuracies in stone data from external sources.
- Image copyright or licensing issues for scraped pictures.
- Complexity in autonomous agent workflows causing integration challenges.
- Database sync issues or Supabase limits.
- Unexpected delays due to external dependencies (payment, materials, weather).

## Current Step
Start building the stone selection scraper prototype and define the initial Supabase database schema for stone selections and pricing.

## Phase 1 - Apify Lead Sniffer (April 3-5, 2026)
- [x] Create 2 Apify Tasks (Nextdoor + Facebook Groups) for Cincinnati-region remodel/countertop sourcing.
- [x] Configure lead-sourcer env: `APIFY_TOKEN`, `APIFY_NEXTDOOR_TASK_ID`, `APIFY_FACEBOOK_TASK_ID`.
- [x] Run Apify tasks in parallel inside `lead-sourcer` and merge into existing classify + dedupe + webhook relay pipeline.
- [x] Validate transport path: Apify post -> classifier verdict -> relay -> Zapier webhook (`HTTP 200` on wire test).
- [ ] Tune task inputs/keywords for `granite countertops`, `quartz countertops`, `quartzite countertops` by service area.
- [x] Add runtime hardening controls (task toggles, timeout, delay, and env alias support for task IDs).
- [x] Ensure direct source commands honor `LEAD_SOURCER_MODE` / `--mode=` to prevent accidental live relays.
- [x] Add interval scheduler + run summary logging in `lead-sourcer/src/index.js`.
- [x] Add daily monitoring summary script (`npm run summary:daily`) with zero-match streak alert threshold support.

**BLOCKER RESOLVED (Apr 4, 2026):**
- **Root cause**: Classifier was too strict — posts with strong material anchors (granite, quartz, backsplash, countertop) but no explicit "hire/quote/estimate" intent were stuck in `borderline`, never relayed.
- **Fix applied**: Changed verdict logic to promote material-anchored posts directly to `match` (no intent signal required). This unblocks ~150 borderline entries in recent runs.
- **Impact**: Reddit + Craigslist now expected to relay 40–80 qualified leads/week instead of 0; Apify will add 20–40/week once APIFY_TOKEN is set.
- **False positives handled**: Regional gating + Zapier source filtering + manual triage catch mismatches (e.g., Keurig organizers, furniture sellers).
- **Ad Library source**: May require `APIFY_ENABLE_AD_LIBRARY=false` under account memory pressure.

Expected outcome: **40–120 qualified homeowner/GC leads/month** flowing to Zapier → Outlook by end of Phase 1.

## Immediate Next Steps (Current Live Ops)
1. **Verify env is loaded at runtime** (`APIFY_TOKEN`, `APIFY_NEXTDOOR_TASK_ID`, `APIFY_FACEBOOK_TASK_ID`, `LEAD_WEBHOOK_URL`).
2. **Run a live cycle** and confirm the run-report heartbeat is sent even on zero-match windows:
   - `cd lead-sourcer && npm start`
3. **Track output quality and streaks**:
   - `npm run summary:daily`
   - `npm run summary:weekly-tuning`
4. **Tune thresholds and source filters weekly** using near-miss/review summaries while keeping hard-match relay criteria stable.
5. **Keep scheduler cadence at every 12 minutes** once run reports and match flow look stable.

## Nightly Closeout (Apr 4, 2026)

- [x] Runtime wiring fixed for Apify: copied `APIFY_TOKEN`, `APIFY_NEXTDOOR_TASK_ID`, and `APIFY_FACEBOOK_TASK_ID` into `lead-sourcer/.env` (poller runtime file).
- [x] Apify robustness fix shipped: `pollApify()` now returns a stable `{ matches, stats }` object on all skip paths.
- [x] Craigslist source quality fix shipped: search sections now prioritize buyer-intent gigs/labor gigs over housing/real-estate listing noise.
- [x] One final live sniffer cycle completed successfully with run report relay (`HTTP 200`) and no pipeline errors.
- [ ] Nextdoor volume remains low (`0` items in latest cycle); continue monitoring while tuning task inputs and cadence.

Latest live validation snapshot (Apr 4, 2026, ~04:24 local):
- Reddit: fetched `176`, matches `0`
- Craigslist: fetched `36`, evaluated `4`, matches `0`
- Apify: fetched `20` (Nextdoor `0`, Facebook Groups `20`), matches `0`
- Run-report webhook: relayed successfully

## Relevant Files (Operational)

- `lead-sourcer/src/index.js`
   - Main orchestrator for Reddit/Craigslist/Apify polls.
   - Writes run summaries and sends run-report relay payloads.

- `lead-sourcer/src/apify.js`
   - Apify task execution (Nextdoor/Facebook/Ad Library), classification, and relay path.
   - Includes timeout/delay controls and skip-path handling.

- `lead-sourcer/src/craigslist.js`
   - Craigslist poller with buyer-intent sections (`ggg`, `lbg`, `hss`) and body-enrichment logic.
   - Contains listing-noise filtering and per-run body fetch caps.

- `lead-sourcer/src/config.js`
   - Runtime env controls for query limits, source toggles, task IDs, thresholds, and delay settings.
   - First place to check when behavior changes unexpectedly.

- `lead-sourcer/.env`
   - Runtime env file used by lead-sourcer commands when launched from `lead-sourcer` directory.
   - Must contain Apify and webhook secrets for live operation.

- `lead-sourcer/runs/poll-runs.jsonl`
   - Source-of-truth historical run ledger used by daily/weekly summaries.

- `lead-sourcer/scripts/daily-summary.mjs`
   - Daily run health summary and zero-match streak alert logic.

- `lead-sourcer/scripts/weekly-tuning-summary.mjs`
   - Near-miss and review-queue analytics for threshold tuning decisions.

## Phase 1.5 - Zapier Hardening (Deferred / Optional)
- [ ] Add source guard filter before Outlook to suppress internal/test traffic (for example `wire-test`).
- [ ] Add richer triage fields to email output (`source`, `routeId`, classifier score when available).
- [ ] Add low-volume alerting path when accepted lead volume is zero for a configured window.
- [ ] Document/verify dedupe retention policy in Zapier Storage for predictable replay behavior.

## Phase 2 - AI Agent + Self-Learning (April 6-10, 2026)
- [ ] Connect qualified leads to conversational state machine (greet, qualify, scope questions, estimate handoff).
- [ ] Feed anonymized conversation outcomes back into retrieval context and prompt tuning.
- [ ] Keep pricing context fresh from supplier pipeline and include disclosure-safe estimate wording.

## Cost Notes
- Apify usage is expected to remain low at current volume; monitor actor + proxy spend and adjust polling cadence/query limits as needed.

---

## Session Closeout — Apr 4, 2026

### Frontend — Spring Offer UI
- **`frontend/data/homepage-content.js`**: Replaced rebrand announcement with spring sink offer (`ctaLabel: 'Free Sinks'`, `ctaHref: '#quote'`, `disclaimer: 'Offer good through May 30, 2026.'`).
- **`frontend/components/FeaturesBar.jsx`**: Wired spring offer, added fluorescent fuchsia bottom-edge glow and neon-lime "Free Sinks" CTA button.
- **`frontend/styles/globals.css`**: Added `.feature-highlight--spring::after` (fuchsia glow bar) and `.feature-highlight-cta` (neon-lime button style). Widened `.nav-brand-secondary` letter-spacing to 0.52em to center "Collective" in navbar.

### Dark Theme Default
- **`frontend/pages/_document.jsx`**: Restored dark theme as default. Changed `savedTheme || systemPreference` to `savedTheme || 'dark'` to prevent washed-out light-mode flash on cold load. Commit: `9f5cb16`.

### OG / Social Preview Fixes
- **Invalid OG tags removed**: Eliminated non-standard `og:image:url` and `twitter:image:src` properties from all page templates (`index.jsx`, `materials/[slug].jsx`, `service-areas/[slug].jsx`, `coverage/index.jsx`). WhatsApp/Telegram strictly validate tag names; iMessage is lenient which masked the bug. Commits: `36526ff`, `d838806`.
- **OG image switched to static PNG**: All templates now point to `/brand/urban-stone-og.png` (direct static asset, 153 KB, 1200×630). Eliminates API-route/robots conflict that previously could block WhatsApp's image fetch.
- **`robots.txt.js` updated**: Added explicit `Allow: /api/og-image` before the broader `Disallow: /api/`. Cache of prior blocked-scrape may linger; force Meta Sharing Debugger re-scrape after next deploy.
- **Coverage page unignored**: Removed stale gitignore suppression of `frontend/pages/coverage/index.jsx`. Page is now tracked, deployed, and serving clean OG tags. Commit: `d838806`.

### Canonical Host Standardization (WhatsApp OG reliability)
- **Root cause**: Meta/WhatsApp caches OG objects per full URL including scheme+host. Prior metadata churn (bare → www → bare) left failed cache entries on both host variants. Unifying to one canonical host prevents split-cache scenarios.
- **`frontend/lib/site.js`**: Changed `DEFAULT_SITE_URL` from `https://urbanstone.co` → `https://www.urbanstone.co`. All generated canonical and OG URLs will use the www variant.
- **`frontend/next.config.mjs`**: Added `redirects()` rule — permanent 301 from `urbanstone.co/:path*` → `https://www.urbanstone.co/:path*`. Ensures crawlers (WhatsApp `facebookexternalhit/1.1`, Telegram, Slack) always scrape the canonical www origin.
- **`robots.txt.js`**: No change required — already calls `getSiteUrl()` which now returns `www.urbanstone.co`.

### Post-Deploy Action Required
- Open [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) and scrape both `https://urbanstone.co` (to flush the old redirect target) and `https://www.urbanstone.co` to seed a fresh valid cache.
- Verify WhatsApp preview with a share link once Vercel deploy propagates (typically < 2 min).
