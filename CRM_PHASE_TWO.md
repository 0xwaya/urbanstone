# CRM phase two: automatic intake

Every new lead is saved into the Supabase CRM (`crm` schema, project `urbanstone`)
right after its lead email has been sent. Both parts are **off by default**
(`CRM_SYNC_ENABLED`), and neither can block or delay a lead email.

## Database (already applied to the `urbanstone` project)

| Migration | What it does |
|---|---|
| `frontend/supabase/migrations/20261030_crm_v1_schema.sql` | `crm` schema: contacts, intakes, communications, quotes, quote_line_items, `contact_summary` view. RLS on, no policies, no anon/authenticated grants. |
| `frontend/supabase/migrations/20261030_crm_ingest_rpc.sql` | `public.crm_ingest_intake(jsonb)` and `public.crm_keepalive()`, `SECURITY DEFINER`, `EXECUTE` granted to `service_role` only. |
| `frontend/supabase/migrations/20261030181442_crm_ingest_hardening.sql` | Fixes from the end-to-end test (same signature and grants): placeholder/short phones are no longer stored; generic names (Anonymous, Owner, Unknown, …) never match a contact by company; a bad optional field (contact_type, valuation, received_at) no longer drops the intake; indexes on `communications.intake_id`, `quotes.intake_id`, `lower(contacts.company_name)`; `EXECUTE` on the platform event-trigger function `rls_auto_enable()` revoked from anon/authenticated (advisor 0028/0029). |

These files were applied by hand through the Supabase connector (there is no `supabase/config.toml`,
so nothing applies them automatically on merge). The two older CRM files share the `20261030`
prefix; if the Supabase CLI is ever wired up, rename them to their applied versions
`20261030171002_crm_v1_schema.sql` and `20261030171332_crm_ingest_rpc.sql` first.

The `crm` schema is not exposed through the Data API; all writes go through
`crm_ingest_intake`, which:

- matches the contact by normalized email, then phone (last 10 digits), then company name
  (case-insensitive); fills blank fields only, never overwrites;
- drops placeholder contacts (`auto+…@urbanstone.co`, `+1-000-000-…`);
- inserts the intake idempotently on `(source_channel, source_ref)` (permit number for
  the lead sourcer, the route's dedupe key for the website), so reruns never duplicate;
- returns `is_repeat`, `prior_intakes` and `prior_outbound_emails` for repeat detection.

## Lead sourcer (`lead-sourcer/src/crm-sync.js`)

Runs in `live` mode after polling finishes (all lead emails already sent), for the
leads that were delivered. Saves contractor name, email, phone, job address/city/zip,
scope, valuation, permit number, score/band and sub-source (`permit_cincinnati`,
`permit_hamilton`, `permit_butler`). Uses `fetch` to the PostgREST RPC endpoint
(no new dependency), 8 s timeout per call.

The run report gets a **CRM** section (contact-free): counts, `REPEAT contractor: <company>
(permit …) — N earlier intake(s), N earlier email(s) from us`, and any CRM errors.
On runs with no new leads it calls `crm_keepalive()` so the free project doesn't pause.

### Workflow lines to add (Edward; `.github/workflows/lead-sourcer.yml`, job `run`, `env:`)

```yaml
      CRM_SYNC_ENABLED: ${{ vars.CRM_SYNC_ENABLED || 'false' }}
      SUPABASE_PROJECT_URL: ${{ secrets.SUPABASE_PROJECT_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Then set the repo variable `CRM_SYNC_ENABLED` to `true` to turn it on.

## Website (`frontend/lib/crm-intake.js`)

`/api/lead` (channel `website_form`), `/api/chat` intake (`website_chat`) and
`/api/contractor-estimate` (`contractor_estimate`) save the contact + intake after
the Resend email succeeds. Server-only via `lib/supabase.js` (service role key never
reaches the browser). Capped at 2.5 s, never throws; a failure is logged as
`crm_intake_failed` without contact details. The drawing image, IP and user agent are
not stored.

### Vercel env vars (Production; Edward)

- `CRM_SYNC_ENABLED` = `true` to turn it on (unset/false = off)
- `SUPABASE_PROJECT_URL` (or `SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

## Keep-alive

The free Supabase project pauses after ~7 days without activity. With the lead sourcer
flag on, every scheduled run (3×/day) either writes intakes or calls `crm_keepalive()`.
If the lead sourcer is ever paused for a week, add a daily ping (e.g. a Vercel cron to a
small route calling `crm_keepalive`) or upgrade the plan.

## Test results (Fri Oct 30, 2026, ~2:15 PM ET)

- Unit tests: lead-sourcer 95/95, frontend 111/111, lint clean (one existing warning). CI on PR #5 green.
- Live database, 30 labeled TEST payloads through `crm_ingest_intake` (all rows deleted afterwards,
  counts back to 19 contacts / 20 intakes / 14 communications / 3 quotes / 22 line items):
  permit lead creates contact + intake; rerun of the same permit creates nothing new; the same contractor
  on a new Hamilton permit (matched by company name), a Butler permit (matched by phone in a different
  format), a contractor-estimate form and a website form (matched by email, different case) all attach to
  the one contact, return `is_repeat=true` with the right prior count, and `contact_summary.is_repeat` is
  true; website form / chat / contractor-estimate rows keep no IP, user agent or drawing image; malformed
  input (no channel, unknown channel, null, array, string) is rejected with an error and leaves no rows.
- Access: anon and authenticated keys get `401 permission denied` on both RPCs and `406 Invalid schema: crm`
  on every table; at the database level both roles get `permission denied for schema crm`.
- Fail-safe (branch code against the live URL with the public key, an unreachable host and a hanging
  server): flag unset/false makes no request; every failure returns a result and never throws; website
  save is capped at 2.5 s; the lead sourcer now stops after the first timeout/network error instead of
  waiting 8 s per lead.

## Deployment checklist (Edward only)

1. **Merge PR #5** into `main` (Squash and merge).
2. **Workflow lines** — edit `.github/workflows/lead-sourcer.yml` on `main`, job `run`, under `env:`
   (next to `RESEND_API_KEY`), add exactly:
   ```yaml
         CRM_SYNC_ENABLED: ${{ vars.CRM_SYNC_ENABLED || 'false' }}
         SUPABASE_PROJECT_URL: ${{ secrets.SUPABASE_PROJECT_URL }}
         SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
   ```
3. **GitHub secrets** (Settings → Secrets and variables → Actions → Secrets): `SUPABASE_PROJECT_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` already exist. Make sure they are for project `urbanstone`
   (`https://vbfxlopsbtftvtrgoiaq.supabase.co`; key from Supabase → Project Settings → API Keys →
   `service_role`/secret). Update them if unsure.
4. **GitHub variable** (same page → Variables): add `CRM_SYNC_ENABLED` = `true`.
5. **Vercel** (project `urbanstone` → Settings → Environment Variables → Production):
   `CRM_SYNC_ENABLED` = `true`, `SUPABASE_URL` (or `SUPABASE_PROJECT_URL`) = the URL above,
   `SUPABASE_SERVICE_ROLE_KEY` = the service-role key (mark Sensitive; never a `NEXT_PUBLIC_` name).
   Then redeploy Production so the new values load.

## Verify after the first run

- Lead sourcer: Actions → Lead Sourcer → Run workflow (or wait for 8 AM / 12 PM / 5 PM ET). The run log
  shows `[crm] attempted=N created=… failed=0`; the run-report email has a **CRM** section
  (`CRM sync: N new intake(s) …`, plus any `REPEAT contractor:` lines). With no new leads it pings
  `crm_keepalive` instead.
- Website: send one real test from the site form with your own email. Vercel → Logs shows
  `crm_intake_saved` (not `crm_intake_failed`).
- Supabase → Table editor → schema `crm` → `intakes`: the new rows (`source_channel` lead_sourcer /
  website_form). Delete your own test row afterwards.

## Roll back

- Fastest (no code change): set the GitHub variable `CRM_SYNC_ENABLED` to `false` (or delete it) and the
  Vercel `CRM_SYNC_ENABLED` to `false` + redeploy. Lead emails and the website keep working exactly as
  before; nothing else changes.
- Full: revert the PR #5 merge commit on `main`. The database objects can stay (they are unused when
  the flag is off); bad rows can be removed in Supabase by `source_run` / `received_at`.
