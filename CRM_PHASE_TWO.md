# CRM phase two: automatic intake

Every new lead is saved into the Supabase CRM (`crm` schema, project `urbanstone`)
right after its lead email has been sent. Both parts are **off by default**
(`CRM_SYNC_ENABLED`), and neither can block or delay a lead email.

## Database (already applied to the `urbanstone` project)

| Migration | What it does |
|---|---|
| `frontend/supabase/migrations/20261030_crm_v1_schema.sql` | `crm` schema: contacts, intakes, communications, quotes, quote_line_items, `contact_summary` view. RLS on, no policies, no anon/authenticated grants. |
| `frontend/supabase/migrations/20261030_crm_ingest_rpc.sql` | `public.crm_ingest_intake(jsonb)` and `public.crm_keepalive()`, `SECURITY DEFINER`, `EXECUTE` granted to `service_role` only. |

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
