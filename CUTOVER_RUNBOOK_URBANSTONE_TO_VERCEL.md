# Urbanstone Cutover Runbook (Near-Zero Downtime)

This runbook replaces the live Amazon Granite Vercel deployment with the upgraded Urban Stone implementation from this repo.

## Scope

- Source code to launch: /Users/pc/.openclaw/workspace/urbanstone/frontend
- Current live deployment repo: /Users/pc/.openclaw/workspace/amazon-granite/frontend
- Goal: near-zero interruption cutover with explicit rollback path.

## Hard Gates (Do Not Cut Over Until Green)

1. Urbanstone quality gates pass:

- npm run lint
- npm run test
- npm run build
- PLAYWRIGHT_BASE_URL=<preview-url> npm run test:smoke

1. Lead delivery wiring is confirmed:

- LEAD_WEBHOOK_URL is set in Vercel Production and Preview environments.
- A real end-to-end test confirms a lead reaches your actual receiver.

1. Environment parity complete:

- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_COMPANY_PHONE
- NEXT_PUBLIC_LEAD_EMAIL
- NEXT_PUBLIC_INSTAGRAM_URL
- NEXT_PUBLIC_FACEBOOK_URL
- NEXT_PUBLIC_TIKTOK_URL
- NEXT_PUBLIC_WAYALABS_URL
- LEAD_WEBHOOK_URL
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- CONTRACTOR_SESSION_SECRET
- RESEND_API_KEY
- CONTRACTOR_EMAIL_FROM (optional; defaults to `Urban Stone <no-reply@send.urbanstone.co>`)
- CONTRACTOR_EMAIL_FROM (optional; defaults to `Urban Stone <sales@urbanstone.co>`)
- CONTRACTOR_ADMIN_EMAILS (optional; comma-separated runtime override)
- CONTRACTOR_APPROVED_EMAILS (optional; comma-separated runtime override)

## Pre-Cutover Checklist

1. Capture baseline from current live project:

- Current production deployment URL
- Current environment variables
- Current branch and commit
- Last known good rollback commit

1. Verify Vercel project linkage strategy:

- Keep same Vercel project to preserve domains and DNS behavior.
- Point production source to urbanstone only after preview validation.

1. Validate webhook contract:

- Urbanstone sends expanded lead payload fields.
- Confirm receiver accepts all fields and larger payload sizes.

## Cutover Sequence

1. Deploy urbanstone to Vercel Preview.
2. Run smoke/UAT on preview:

- Homepage render
- Quote section start/cancel behavior
- Form validation UX
- Successful lead submission
- Webhook receipt
1. In a low-traffic window, switch production source to urbanstone.
2. Monitor first deployment logs to completion.
3. Run immediate production checks:

- Open homepage
- Submit one real lead
- Confirm receiver entry
- Confirm no sustained 4xx/5xx in Vercel logs

## Rollback Triggers

Rollback immediately if any of the following occurs for more than 5 minutes:

- Lead submissions fail (4xx/5xx or no receiver entries)
- Sustained API error spike
- Critical rendering/navigation regression on primary landing pages

## Rollback Steps

1. Repoint production source back to prior amazon-granite branch/commit.
2. Trigger redeploy.
3. Confirm homepage and lead API recover.
4. Re-run one production lead test.

## Post-Cutover (First 24-72h)

1. Monitor lead delivery volume and webhook failures.
2. Monitor Vercel logs for serverless/API anomalies.
3. Keep rollback path intact for at least 24 hours.
4. Archive old code path only after stable observation window.

## Notes

- In production, urbanstone requires LEAD_WEBHOOK_URL; it will not use local dev webhook fallback.
- Local dev webhook route is disabled in production by design.
- Contractor magic-link emails require RESEND_API_KEY and a verified sender domain in Resend.
  The default sender uses the `send.urbanstone.co` subdomain — verify this subdomain in the Resend
  dashboard before go-live, or override via CONTRACTOR_EMAIL_FROM.
- Contractor magic-link emails require RESEND_API_KEY. The verified Resend domain is `urbanstone.co`
  and the default sender is `sales@urbanstone.co` — no additional DNS setup needed.
  Override via CONTRACTOR_EMAIL_FROM if needed.
- NEXT_PUBLIC_SITE_URL must be the production origin (e.g. `https://www.urbanstone.co`). This
  variable is embedded at build time for metadata but the contractor magic-link URL is resolved from
  request headers at runtime, so a stale build value will not break email links.
- Admin emails are hard-coded in `lib/contractor-access.js`. Use CONTRACTOR_ADMIN_EMAILS env var
  to add entries without a redeploy.
