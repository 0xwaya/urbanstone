# Frontend

Standalone Next.js pages application for the Urban Stone Collective marketing site.

This frontend includes the current live layout pass for navigation, homepage hierarchy, curated material browsing, contractor intake, and quote capture.

The English and Spanish landing pages promote the fall complimentary stainless sink offer for qualifying kitchen projects of 50 sq ft or more, valid October 15 through December 15, 2026, with a direct link to the estimate form.

The supplier section now follows the current slab-first funnel:

- each supplier card stays compact and shows logo, company name, location, and hours only
- curated slab previews are the primary action and lazy-load on demand
- supplier phone and portal-first behavior are intentionally removed from the homepage flow
- the materials section now includes an explicit Urban Stone next-step handoff after browsing
- location and hours are collapsible and share a tighter single-card treatment on mobile
- supplier logos are visually toned down to fit the current brand system
- the supplier anchor target includes extra mobile scroll offset so the sticky header does not cover the section heading
- contractor portal entry is exposed from the homepage teaser, mobile hamburger menu, and footer CTA cluster

The active homepage funnel is:

- scan the materials section quickly
- open curated slab previews only when needed
- return to Urban Stone for estimate, measurements, deposit, fabrication, and installation

## Homepage Layout

Section order (English `/` and Spanish `/es`): hero, fall offer bar, **Recent projects** (rotating gallery), materials + estimate form, contractor partner section, FAQ, reviews, **What we do** (services, last section before the footer). Homeowners come first; the contractor section deliberately sits below materials and the estimate form.

- `components/ServicesSection.jsx` + `data/services-content.js`: countertops, cabinets, remodels, interior renovations and redesign, flips, high-end custom bathrooms, and owner-run job-site/contractor management with the collective's crews and a structural engineering partner.
- `components/ContractorCard.jsx`: contractor/builder partner pitch and portal entry.

## Projects Gallery

- `data/projects.js` is the single source for the homepage carousel (`components/ProjectsGallery.jsx`) and the `/projects` and `/es/projects` pages (`components/projects/ProjectsPage.jsx`). UI strings live in `data/projects-content.js`.
- The homepage rotates up to `MAX_FEATURED` (8) projects marked `featured: true`, in file order, so put new work at the top. Every project appears on `/projects`, grouped by job.
- Add photos: `npm run projects:add -- <job-id> path/to/*.jpg` resizes them, strips EXIF/GPS, writes `public/projects/<job-id>/`, and prints a starter entry. Add the job to `jobs` if new, paste the entry into `projects`, and fill every TODO with English and Spanish titles, text and descriptive alt text. `photos[0]` is the cover.
- Rules: no client names, no street addresses (city or neighborhood only, as approved by the owner), no listing/rental/sale links, no brands, specs or prices.
- Check: `npx vitest run tests/projects-data.test.js` (files exist, fields filled, no TODOs) and `tests/projects-seo.test.js` (sitemap and `/llms.txt`).
- SEO: the projects pages carry canonical + `hreflang`, a real project photo as the Open Graph image, breadcrumb JSON-LD, and `CollectionPage`/`ImageGallery` JSON-LD generated from the same data, so new projects are picked up automatically.

## Requirements

- Node.js 20.11 or newer
- npm 10 or newer

## Local Development

1. `npm install`
2. `npx playwright install chromium`
3. `cp .env.example .env.local`
4. Set `RESEND_API_KEY` so quote requests, chat intakes, and contractor estimates email `sales@urbanstone.co`.
5. `npm run dev`

Recommended local run command (avoids port conflicts):

- `npm run dev -- --hostname 127.0.0.1 --port 3001`

## Environment Variables

- `NEXT_PUBLIC_COMPANY_PHONE`: phone number rendered in the UI.
- `NEXT_PUBLIC_LEAD_EMAIL`: fallback email address rendered in the UI.
- `NEXT_PUBLIC_SITE_URL`: canonical production origin used for metadata, robots, and sitemap output.
- `NEXT_PUBLIC_WAYALABS_CHATBOT_URL`: optional external chatbot embed URL. If unset, the floating widget falls back to the local Stone Haven client that also powers `/ai-chat`.
- `NEXT_PUBLIC_WAYALABS_CHATBOT_LABEL`: optional CTA label for the chatbot button (defaults to "Chat with Stone Haven").
- `LEAD_EMAIL_TO` / `LEAD_EMAIL_FROM`: optional overrides for lead emails from `/api/lead`, `/api/chat` intake, and `/api/contractor-estimate` (defaults `sales@urbanstone.co` / `Urban Stone <sales@urbanstone.co>`). Leads are sent directly via Resend; no webhook is involved.
- `ENABLE_CHAT_PRICE_PREVIEW`: optional chat-only flag. Keep unset/`false` to suppress price ranges in chat intake (recommended); set to `true` only for controlled internal testing.
- `SUPABASE_URL`: Supabase project URL used by the contractor portal API routes.
- `SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase key for contractor records and magic-link state.
- `CONTRACTOR_SESSION_SECRET`: HMAC secret used to sign the `contractor_session` cookie.
- `CONTRACTOR_ADMIN_EMAILS`: comma-separated admin emails that bypass manual approval for portal access.
- `CONTRACTOR_APPROVED_EMAILS`: optional comma-separated vetted contractor emails that should be auto-approved.
- `CONTRACTOR_EMAIL_FROM`: optional sender address override for contractor emails. Defaults to `Urban Stone <sales@urbanstone.co>`.
- `CONTRACTOR_EMAIL_IMAGE_VERSION`: optional cache-busting version string appended to contractor promo image URLs (for example after replacing `tropical mist` or `bianco ivory` files).
- `CONTRACTOR_NOTIFICATION_EMAILS`: optional comma-separated recipients for direct contractor registration alert emails. Defaults to `sales@urbanstone.co`.
- `CONTRACTOR_NOTIFICATION_BACKUP_EMAILS`: optional comma-separated backup recipients always appended to contractor registration alerts (for example a personal Gmail failover during DNS incidents).
- `CONTRACTOR_APPROVAL_DASHBOARD_URL`: optional URL inserted into contractor registration alert emails for quick approval review.
- `CONTRACTOR_REGISTRATION_WEBHOOK_URL`: optional webhook for contractor registration events (the Resend alert email is always sent).
- `RESEND_API_KEY`: required for lead delivery (website form, chat intake, contractor estimates) and contractor magic-link emails.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL used by browser-based Google OAuth for review invitations. Set before building so the CSP allowlists only this origin.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-safe Supabase anon/publishable key; never expose a service-role key in a `NEXT_PUBLIC_` variable.
- `REVIEW_INVITE_ADMIN_SECRET`: server-only bearer secret (at least 32 bytes) required to issue invites and moderate reviews.
- `REVIEW_INVITE_EMAIL_HMAC_KEY`: independent server-only key (at least 32 bytes) used to HMAC-normalize invited customer email addresses. Keep it stable while invites are outstanding.

If `RESEND_API_KEY` is not set, `/api/lead` and `/api/contractor-estimate` return a 503 and chat intake reports a submission error. Delivery succeeds only after Resend accepts the email.

## Customer reviews (CRM invites, collected on urbanstone.co)

Reviews are collected on Urban Stone's own site until the Google Business Profile is verified. Nothing is posted to Google.

- **Eligibility (CRM):** `crm.review_requests` gets one row per quote automatically (trigger + backfill) when a quote is `closed`, `balance_due = 0` and `amount_paid > 0`. Status flow: `eligible` -> `approved` (invite link created) -> `sent` -> `reviewed`, or `declined`.
- **Admin:** `/admin/reviews` (noindex). Sign in with `REVIEW_INVITE_ADMIN_SECRET`. Each eligible customer shows the exact email; **Approve & send** sends that one message from `sales@urbanstone.co` via Resend (BCC sales@) when `RESEND_API_KEY` is set, otherwise it creates the link and shows the email to send manually, then **Mark as sent**. Each send is logged to `crm.communications`; a request that is `sent`/`reviewed`/`declined` can never be sent again. Pending reviews are published/rejected here; publishing revalidates `/` and `/es` immediately.
- **Customer:** the one-time invite link (14 days, single use, stored only as a SHA-256 digest) is the verification; name/email/job are prefilled. Google sign-in is no longer required (the earlier OAuth RPC remains in the database and can be re-enabled later).
- **Homepage:** `getStaticProps` loads published reviews (first name + last initial, job, location, month) with on-demand revalidation; with none, the section shows a short "inviting recent customers" note and no error.
- **Google later:** set `REVIEW_GOOGLE_REVIEW_URL` (Google review short link) and the invite email adds a "leave one on Google" line automatically.
- **Database:** `supabase/migrations/20261017_invited_customer_reviews.sql` + `20261031_review_requests_crm.sql`. All access goes through SECURITY DEFINER RPCs: public ones are gated by the invite-token digest, admin ones by the SHA-256 of the admin secret stored in `public.review_admin_config` (rotate both together).
- **Env:** `REVIEWS_SUPABASE_URL`, `REVIEWS_SUPABASE_PUBLISHABLE_KEY` (public key; falls back to the CRM service client), `REVIEW_INVITE_ADMIN_SECRET`, `REVIEW_INVITE_EMAIL_HMAC_KEY`, optional `REVIEW_INVITE_DELIVERY=manual`, optional `REVIEW_GOOGLE_REVIEW_URL`.

## Contractor Portal

The frontend now includes a gated contractor portal for multi-unit builder pricing.

- public entry: `/contractors/login`
- protected page: `/contractors`
- middleware redirects unauthenticated portal requests to the login page
- registration writes contractor records to Supabase
- login issues one-time magic links and sets a signed `HttpOnly` session cookie after verification
- portal pricing is not exposed on the public homepage; the portal is linked from the homepage teaser plus the primary navigation/footer entry points
- the contractor pricing page now pairs a commercial intake assistant with expandable material tiers, program specs, and direct call/email actions

Approval model:

- emails in `CONTRACTOR_ADMIN_EMAILS` are treated as admins
- emails in `CONTRACTOR_APPROVED_EMAILS` are treated as pre-vetted contractors
- all other registrations remain pending until `approved=true` is set in Supabase

Operational notifications:

- every successful contractor registration now triggers a direct app-side alert email to `sales@urbanstone.co` by default
- the same registration also emits a structured `contractor_registration` webhook event with a `mailingListRow` object so Zapier, Make, or Apps Script can append a Google Sheet row without parsing email copy
- contractor commercial estimate submissions post to `/api/contractor-estimate` and emit a `contractor_estimate` webhook payload for downstream follow-up and quoting workflows

Contractor pricing email preview:

- preview send: `npm run contractor:email:preview`
- approved-recipient send: `node --env-file=.env.local scripts/send-contractor-deals-email.mjs --approved --confirm-approved-send`
- preview defaults to `sales@urbanstone.co`
- approved-recipient sends are safety-locked and require explicit runtime confirmation (`--confirm-approved-send`) to avoid accidental customer blasts

Minimum Supabase tables:

```sql
CREATE TABLE contractors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  company_name text NOT NULL,
  website text NOT NULL,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE magic_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id uuid REFERENCES contractors(id),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false
);
```

Lead webhook payload notes:

- `metadata.requestId`: per-request correlation ID. Uses inbound `x-request-id` when provided, otherwise generated server-side.
- `metadata.dedupeKey`: deterministic short hash derived from normalized lead content for downstream duplicate suppression.

## Quality Gates

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:smoke`
- `npm run snapshots:mobile`

## SEO & AI Discoverability

- `lib/seo.js` centralizes local-business structured data (`buildLocalBusinessSchema`) used by the homepage, `service-areas/[slug]`, and `materials/[slug]` pages: `priceRange`, service-hub `geo` coordinates, a `GeoCircle` service radius, and a `hasOfferCatalog` listing quartz/granite/quartzite fabrication and installation as distinct `Service` entities.
- `pages/robots.txt.js` explicitly allows major AI/answer-engine crawlers (`GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `ClaudeBot`, `Claude-Web`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, `Amazonbot`, `Bytespider`, `CCBot`) alongside the default `Allow: /` rule.
- `pages/llms.txt.js` serves a plain-text business summary, contact info, service area, and full page link map at `/llms.txt` for AI assistants and answer engines to cite accurately.
- `/llms.txt` also links the projects gallery and lists current projects from `data/projects.js`; `sitemap.xml` includes `/projects` and `/es/projects`.
- `/projects` and `/es/projects` emit `CollectionPage` + `ImageGallery` JSON-LD (one `ImageObject` per photo, linked to the business `@id`) and use a project photo for Open Graph/Twitter cards.
- `data/homepage-content.js` FAQ items are written as natural-language local-intent Q&A (e.g. "best countertop company near me in Cincinnati") to support both classic featured snippets and AI Overview-style extraction.
- The high-intent Cincinnati quartz query has a dedicated material page at `/materials/cincinnati-quartz-countertops`; city-wide and material-specific pages should remain distinct so each page answers one search intent clearly.

## Bilingual Portal & Texting

- `/` remains the English customer portal; `/es` is the neutral-Spanish version with translated hero, materials, estimate, FAQ, contractor, and footer sections.
- The shared navigation includes an `EN | ES` switcher with reciprocal homepage links and locale-aware `hreflang` metadata.
- `lib/contact.js` builds SMS deep links to the business line. Set `NEXT_PUBLIC_COMPANY_SMS` to override the default `+15133075840`.
- SMS actions appear in the main navigation, quote contact panel, Onyx chat footer, and contractor access page with prefilled context prompts.
- The customer-facing chatbot is branded **Onyx** / **Onyx AI Assistant**. Internal component filenames remain unchanged to avoid unnecessary runtime churn.
- The homepage review section renders only reviews published in `/admin/reviews` (statically, revalidated on publish); no demo/placeholder testimonials, no Review/AggregateRating schema.

Security check:

- `npm audit --json`

Browser automation notes:

- `npm run test:smoke` verifies the mobile quick-contact launcher open-dismiss-reopen flow and `#quote` anchor navigation.
- `npm run snapshots:mobile` captures full-page mobile screenshots for `/`, one service-area route, and one material route into `test-artifacts/snapshots`.
- Use an explicit base URL when local dev runs on a non-default port:
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:smoke`
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run snapshots:mobile`

## Estimate Form Schema

The estimate form now captures both freeform project context and structured scoping fields.

Required base fields:

- full name
- email
- phone
- project details

Measurement input requirement:

- upload a rough drawing image (`png`, `jpg`, `jpeg`, phone image), or
- provide total square footage (not final; confirmed during on-site measurement)

Additional required scope fields:

- current tops removal (`yes`, `no`, `unsure`)
- current tops material (text input)
- new sink basin preference (`single`, `double`, `reuse-existing`)
- new sink mount preference (`undermount`, `topmount`, `reuse-existing`)
- new sink material preference (`stainless-steel`, `composite`, `reuse-existing`)
- backsplash (`4-inch`, `full-height`, `none`)
- customer timeframe (`1-week`, `2-weeks`, `1-month`)
- material preference (multi-select: `granite`, `marble`, `quartzite`, `quartz`)

Server-side validation and normalization for these fields is implemented in `lib/lead.js` and used by `pages/api/lead.js`.

## Troubleshooting

`npm audit --fix`:

- if audit reports Playwright or lodash issues, run `npm install` first to apply the repo-pinned dependency updates.
- avoid `npm audit fix --force` unless you intentionally want to rewrite version ranges.

`npm run test:smoke` executable-not-found error:

- run `npx playwright install chromium` after dependency updates.
- rerun smoke tests with an explicit base URL, for example:
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:smoke`

Chatbot troubleshooting:

- if `NEXT_PUBLIC_WAYALABS_CHATBOT_URL` is not set, the widget intentionally renders the local Stone Haven chat client instead of a blank placeholder panel
- `/api/chat` now falls back to the internal knowledge base when `ollama` is not installed or not reachable, instead of leaving the chat waiting on a failing local model call
- MemPalace context is optional; if the local CLI is unavailable or returns no results, chat still responds from the repo knowledge base
- Stone Haven now starts with an assistant welcome message and then runs estimate intake only when estimate intent is explicit or an active intake session exists
- Stone Haven greeting is now one-time per conversation history; simple follow-up greetings do not trigger a second self-introduction
- chat intake submission is intentionally strict (`send it`/`submit estimate`) to avoid accidental lead routing
- when intake asks for full name, plain replies such as `john doe` are now captured; obvious probe text (for example `echo line`) is ignored
- generic countertop questions now stay city-agnostic unless the user includes a service-area/city context
- recommendation follow-ups now prioritize natural prompts (`material/look` + curated selection) over location-specific SEO snippets
- early-turn chat now uses a deterministic FAQ-first layer (from homepage/site Q&A) before broad retrieval, so common material/timeline/service questions stay concise and grounded
- retrieval reranking now boosts FAQ entries and down-ranks location-heavy SEO material/service snippets when city/service intent is not explicit
- chat-origin lead relays now include top-level `requestId`, `dedupeKey`, and `metadata` for Zap contract consistency
- chat transcript area now includes a persistent in-panel scroll rail indicator so long conversations show visible scroll affordance
- browser-level chat verification may require `npx playwright install chromium`; local validation will fail if the machine is out of disk space during browser download

Generated build output and local validation backup directories are not part of the source review surface and should stay ignored during routine lint and git review.

Current optimization priorities from the live review:

- keep the quick-contact widget from obscuring the mobile hero on first load
- preserve a direct reopen path after dismissal instead of forcing the panel open on every refresh
- keep `.env.example` in sync with the documented setup flow
- pin the Next.js tracing root so local dev and builds do not infer the wrong workspace root when multiple lockfiles are present

Drift control decision:

- `frontend` is the single active implementation surface.

For a production-like local verification pass, run:

- `HOSTNAME=127.0.0.1 PORT=3000 npm run start`

For live browser tuning during UI work, run:

- `npm run dev -- --hostname 127.0.0.1`

## Deployment

### Container

Build and run the included Docker image:

```bash
docker build -t urban-stone-frontend .
docker run --rm -p 3000:3000 --env-file .env.local urban-stone-frontend
```

### Process Hosting

The app builds with Next.js standalone output enabled.

```bash
npm run build
HOSTNAME=127.0.0.1 PORT=3000 npm run start
```

The `start` script runs `node .next/standalone/server.js`.

The production server requires `sharp` to be installed because the site uses Next image optimization in standalone mode.

Recommended release sequence:

1. install dependencies in `frontend`
2. set `RESEND_API_KEY` and any public contact environment values
3. run lint, test, and build
4. start the production server from `frontend` or deploy the `frontend` directory through your host

## Runtime Hardening

The current baseline includes:

- security headers in `next.config.mjs`
- same-origin enforcement for the lead endpoint
- payload normalization and validation
- a honeypot field to catch simple bots
- basic in-memory rate limiting for repeated submissions

Recent UI behavior worth preserving:

- the homepage hero now uses a two-column layout with fast-scan proof points and a short next-step brief without changing the core brand voice
- supplier cards are optimized to scan cleanly on mobile before expanding into desktop two-column layouts
- location and hours metadata is compacted into a single mobile card to reduce vertical dead space
- supplier browsing hands visitors back to Urban Stone with section-level estimate and call CTAs
- the sticky mobile header has reduced vertical padding to lower overlap pressure on anchor navigation
- supplier CTA and metadata spacing are intentionally tighter on narrow screens to keep the quote form below the fold
- the homepage contractor teaser should remain a secondary section, not a pricing dump or visual takeover

Local test note:

- `tests/home-page.test.jsx` intentionally mocks `ChatWidget` so homepage rendering assertions stay fast and do not depend on the floating contact/chat panel

Before a real production launch, add external monitoring, persistent rate limiting, and a verified lead-delivery integration.

## Recent Updates (April 2026)

- Rebranded all HavenBot references to Stone Haven, including UI, avatar, and chatbot labels.
- Updated fallback contact email to <stonehaven@urbanstone.co>.
- Fixed missing styling/scripts and static asset issues in live browser.
- Changed 'Dismiss' button to 'Chat' and implemented a modern popup chat window with emoji/avatar.
- Reworked the floating chat widget into a single stable popup path and wired the local fallback to the shared Stone Haven chat client used by `/ai-chat`.
- Tightened `/api/chat` fallback behavior so missing `ollama` or missing MemPalace context do not leave the bot screen hanging.
- Made 'wayalabs' in the footer all lowercase for consistent branding.
- Improved chat popup UX: only one popup at a time, draggable header, resets position on close, and improved accessibility.
- Added a default Stone Haven welcome greeting and tightened chat intake state handling to reduce scripted loops.
- Aligned chat estimate relay payloads with lead webhook contract fields (`requestId`, `dedupeKey`, `metadata`).
- Updated chat visual palette to the Urban Stone gold lane (launcher, popup header gradients, in-chat accents, and scrollbar thumb), removing remaining off-brand blue highlights.
- Current state: chat window uses native overflow scrollbar behavior (Opera/Chromium friendly), with branded gold accents and consistent contrast in popup footer actions.
- SEO hardening: canonical URL resolution now protects production metadata from localhost fallback origins.
- SEO indexing: `sitemap.xml` emits escaped canonical URLs without fabricated request-time `lastmod` values; `robots.txt` disallows non-canonical query crawls and contractor login indexing.
- SEO crawl controls: API and contractor-login responses include `X-Robots-Tag: noindex, nofollow, noarchive`.
- Added `.gitignore` to prevent chatbot source/config from being pushed until fully trained.
- Documented troubleshooting steps for port conflicts and static asset errors.
- Noted that the chatbot backend requires the `ollama` binary for LLM inference (see API errors if missing).
