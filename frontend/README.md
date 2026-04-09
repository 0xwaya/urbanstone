# Frontend

Standalone Next.js pages application for the Urban Stone Collective marketing site.

This frontend includes the current live mobile layout pass for navigation, hero spacing, curated material browsing, and quote capture.

The supplier section now follows the current slab-first funnel:

- each supplier card stays compact and shows logo, company name, location, and hours only
- curated slab previews are the primary action and lazy-load on demand
- supplier phone and portal-first behavior are intentionally removed from the homepage flow
- the materials section now includes an explicit Urban Stone next-step handoff after browsing
- location and hours are collapsible and share a tighter single-card treatment on mobile
- supplier logos are visually toned down to fit the current brand system
- the supplier anchor target includes extra mobile scroll offset so the sticky header does not cover the section heading
- contractor portal entry is now exposed from the mobile hamburger menu and footer CTA cluster instead of a standalone homepage card

The active homepage funnel is:

- scan the materials section quickly
- open curated slab previews only when needed
- return to Urban Stone for estimate, measurements, deposit, fabrication, and installation

## Requirements

- Node.js 20.11 or newer
- npm 10 or newer

## Local Development

1. `npm install`
2. `npx playwright install chromium`
3. `cp .env.example .env.local`
4. Set `LEAD_WEBHOOK_URL` to the HTTPS endpoint that should receive quote requests.
5. `npm run dev`

Recommended local run command (avoids port conflicts):

- `npm run dev -- --hostname 127.0.0.1 --port 3001`

## Environment Variables

- `NEXT_PUBLIC_COMPANY_PHONE`: phone number rendered in the UI.
- `NEXT_PUBLIC_LEAD_EMAIL`: fallback email address rendered in the UI.
- `NEXT_PUBLIC_SITE_URL`: canonical production origin used for metadata, robots, and sitemap output.
- `LEAD_WEBHOOK_URL`: required for successful lead delivery from `/api/lead`.
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
- `CONTRACTOR_ESTIMATE_WEBHOOK_URL`: optional dedicated webhook for contractor commercial estimate requests. Falls back to `LEAD_WEBHOOK_URL`.
- `CONTRACTOR_REGISTRATION_WEBHOOK_URL`: optional dedicated webhook for contractor registration events. Falls back to `LEAD_WEBHOOK_URL`.
- `RESEND_API_KEY`: required for contractor magic-link email delivery.

If `LEAD_WEBHOOK_URL` is not set during local development, `/api/lead` falls back to the local route `/api/lead-dev-webhook` so form submissions still complete while you are building.

In production, `LEAD_WEBHOOK_URL` is still required and missing configuration returns the expected 503 warning.

## Contractor Portal

The frontend now includes a gated contractor portal for multi-unit builder pricing.

- public entry: `/contractors/login`
- protected page: `/contractors`
- middleware redirects unauthenticated portal requests to the login page
- registration writes contractor records to Supabase
- login issues one-time magic links and sets a signed `HttpOnly` session cookie after verification
- portal pricing is not exposed on the public homepage; the portal is linked from mobile navigation and the footer CTA cluster
- the contractor pricing page is intentionally trimmed down into expandable material cards with direct email/text inquiry actions instead of the residential estimate form

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
2. set `LEAD_WEBHOOK_URL` and any public contact environment values
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

- supplier cards are optimized to scan cleanly on mobile before expanding into desktop two-column layouts
- location and hours metadata is compacted into a single mobile card to reduce vertical dead space
- supplier browsing hands visitors back to Urban Stone with section-level estimate and call CTAs
- the sticky mobile header has reduced vertical padding to lower overlap pressure on anchor navigation
- supplier CTA and metadata spacing are intentionally tighter on narrow screens to keep the quote form below the fold

Before a real production launch, add external monitoring, persistent rate limiting, and a verified lead-delivery integration.
