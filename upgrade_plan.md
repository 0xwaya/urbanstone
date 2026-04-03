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

Current blocker:
- Recent runs are producing `0 match` verdicts (mostly borderline/reject), so no outbound emails are triggered.
- Ad Library source may require `APIFY_ENABLE_AD_LIBRARY=false` under account memory pressure.

Expected outcome: materially higher homeowner/GC lead discovery density in target Cincinnati + NKY regions.

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
