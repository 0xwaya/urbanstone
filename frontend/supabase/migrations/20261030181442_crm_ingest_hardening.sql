-- 009 (Oct 30, 2026): CRM phase-two hardening found by the end-to-end test. Additive / in-place only:
-- no data changed, nothing renamed, same function signature and grants (service_role only).
--  1) Phone is stored only when it is a real 10+ digit number (placeholders like +1-000-000-0001
--     and short numbers were being saved into contacts.phone even though they were ignored for matching).
--  2) Generic names (Anonymous, Unknown, Owner, Homeowner, ...) never match an existing contact by
--     company name, so unrelated owner-builder permits are not merged or flagged as repeats.
--  3) A bad optional field no longer loses the whole intake: unknown contact_type -> 'unknown',
--     non-numeric valuation -> null, unparseable received_at -> now(). source_channel stays required.
--  4) Indexes for the unindexed foreign keys reported by the performance advisor, plus the
--     company-name lookup used by the matcher.
--  5) Revoke EXECUTE on the platform event-trigger function public.rls_auto_enable() from
--     anon/authenticated/public (security advisor 0028/0029). Event triggers fire regardless of
--     EXECUTE privilege, and the function cannot be called via RPC anyway.

create or replace function public.crm_ingest_intake(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c        jsonb := case when jsonb_typeof(p) = 'object' then coalesce(p->'contact', '{}'::jsonb) else '{}'::jsonb end;
  i        jsonb := case when jsonb_typeof(p) = 'object' then coalesce(p->'intake', '{}'::jsonb) else '{}'::jsonb end;
  v_email  text  := nullif(lower(trim(c->>'email')), '');
  v_phone  text  := nullif(right(regexp_replace(coalesce(c->>'phone',''), '\D', '', 'g'), 10), '');
  v_phone_raw text := nullif(trim(c->>'phone'), '');
  v_company text := nullif(trim(c->>'company_name'), '');
  v_person  text := nullif(trim(c->>'person_name'), '');
  v_type    text := nullif(trim(c->>'contact_type'), '');
  v_channel text := nullif(trim(i->>'source_channel'), '');
  v_ref     text := nullif(trim(i->>'source_ref'), '');
  v_val_txt text := nullif(trim(i->>'valuation'), '');
  v_valuation numeric;
  v_received timestamptz;
  v_generic boolean;
  v_contact uuid;
  v_intake  uuid;
  v_new_contact boolean := false;
  v_new_intake  boolean := false;
  v_matched_by  text;
  v_prior int;
  v_prior_out int;
begin
  if v_channel is null then raise exception 'intake.source_channel is required'; end if;
  if length(coalesce(v_phone,'')) < 10 then v_phone := null; end if;
  -- placeholders used by older automated payloads
  if v_email like 'auto+%@urbanstone.co' or v_email like 'run-report+%' or position('@' in coalesce(v_email,'@')) = 0 then v_email := null; end if;
  if v_phone like '000000%' then v_phone := null; end if;
  if v_phone is null then v_phone_raw := null; end if;
  if v_type is null or v_type not in ('contractor','homeowner','designer','architect','property_manager','referral_partner','unknown') then
    v_type := 'unknown';
  end if;
  v_generic := v_company is null
    or lower(regexp_replace(v_company, '[^a-zA-Z]', '', 'g')) in
       ('anonymous','unknown','owner','homeowner','propertyowner','owners','self','none','na','tbd','notlisted','notinregistry');
  if v_company is not null and v_generic and v_person is null and v_email is null and v_phone is null then
    v_person := v_company;  -- keep the name as given, but never match on it
    v_company := null;
  elsif v_generic then
    v_company := null;
  end if;
  if v_company is null and v_person is null then
    v_person := coalesce(v_email, v_phone_raw, 'Unknown');
  end if;
  if v_val_txt ~ '^-?[0-9]+(\.[0-9]+)?$' then v_valuation := v_val_txt::numeric; end if;
  begin
    v_received := nullif(i->>'received_at','')::timestamptz;
  exception when others then
    v_received := null;
  end;

  -- 1) contact match: email, then phone, then exact company name (case-insensitive, non-generic)
  if v_email is not null then
    select id into v_contact from crm.contacts where email_norm = v_email limit 1;
    if found then v_matched_by := 'email'; end if;
  end if;
  if v_contact is null and v_phone is not null then
    select id into v_contact from crm.contacts where phone_norm = v_phone order by created_at limit 1;
    if found then v_matched_by := 'phone'; end if;
  end if;
  if v_contact is null and v_company is not null then
    select id into v_contact from crm.contacts where lower(company_name) = lower(v_company) order by created_at limit 1;
    if found then v_matched_by := 'company'; end if;
  end if;

  if v_contact is null then
    begin
      insert into crm.contacts (contact_type, company_name, person_name, email, phone, address, city, state, zip, first_source, notes)
      values (v_type, v_company, v_person, v_email, v_phone_raw,
              nullif(c->>'address',''), nullif(c->>'city',''), nullif(c->>'state',''), nullif(c->>'zip',''), v_channel,
              nullif(c->>'notes',''))
      returning id into v_contact;
      v_new_contact := true;
    exception when unique_violation then
      select id into v_contact from crm.contacts where email_norm = v_email limit 1;
      v_matched_by := 'email';
    end;
  else
    -- fill blanks only; never overwrite what Edward already has
    update crm.contacts t set
      company_name = coalesce(t.company_name, v_company),
      person_name  = coalesce(t.person_name, v_person),
      email = case when t.email is null and v_email is not null
                    and not exists (select 1 from crm.contacts o where o.email_norm = v_email)
                   then v_email else t.email end,
      phone   = coalesce(t.phone, v_phone_raw),
      address = coalesce(t.address, nullif(c->>'address','')),
      city    = coalesce(t.city, nullif(c->>'city','')),
      state   = coalesce(t.state, nullif(c->>'state','')),
      zip     = coalesce(t.zip, nullif(c->>'zip','')),
      contact_type = case when t.contact_type = 'unknown' and v_type <> 'unknown' then v_type else t.contact_type end
    where t.id = v_contact;
  end if;

  -- 2) intake, idempotent on (channel, source_ref)
  if v_ref is not null then
    select id into v_intake from crm.intakes where source_channel = v_channel and source_ref = v_ref;
  end if;
  if v_intake is null then
    begin
      insert into crm.intakes (contact_id, source_channel, sub_source, source_ref, source_run, received_at,
                               project_address, project_city, project_state, project_zip, scope, valuation, raw)
      values (v_contact, v_channel, nullif(i->>'sub_source',''), v_ref, nullif(i->>'source_run',''),
              coalesce(v_received, now()),
              nullif(i->>'project_address',''), nullif(i->>'project_city',''), nullif(i->>'project_state',''),
              nullif(i->>'project_zip',''), nullif(i->>'scope',''), v_valuation, i->'raw')
      returning id into v_intake;
      v_new_intake := true;
    exception when unique_violation then
      select id into v_intake from crm.intakes where source_channel = v_channel and source_ref = v_ref;
    end;
  end if;

  select count(*) into v_prior from crm.intakes where contact_id = v_contact and id <> v_intake;
  select count(*) into v_prior_out from crm.communications
   where contact_id = v_contact and direction = 'outbound' and status = 'sent';

  return jsonb_build_object(
    'contact_id', v_contact, 'intake_id', v_intake,
    'created_contact', v_new_contact, 'created_intake', v_new_intake, 'matched_by', v_matched_by,
    'prior_intakes', v_prior, 'prior_outbound_emails', v_prior_out,
    'is_repeat', v_prior > 0);
end $$;

-- Same grants as 004 (create or replace keeps them; restated so this file is self-contained).
revoke all on function public.crm_ingest_intake(jsonb) from public, anon, authenticated;
grant execute on function public.crm_ingest_intake(jsonb) to service_role;

create index if not exists comms_intake_idx on crm.communications (intake_id);
create index if not exists quotes_intake_idx on crm.quotes (intake_id);
create index if not exists contacts_company_lower_idx on crm.contacts (lower(company_name));

do $$
begin
  if exists (select 1 from pg_proc where oid = to_regprocedure('public.rls_auto_enable()')) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
