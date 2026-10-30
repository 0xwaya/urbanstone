-- Phase two (Oct 30, 2026): RPC entry points so server code can write to crm.* through the
-- Supabase REST API without exposing the crm schema. Additive only: two new functions in public,
-- callable by service_role only (anon/authenticated/public have no EXECUTE). crm tables keep RLS on.

create or replace function public.crm_ingest_intake(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c        jsonb := coalesce(p->'contact', '{}'::jsonb);
  i        jsonb := coalesce(p->'intake', '{}'::jsonb);
  v_email  text  := nullif(lower(trim(c->>'email')), '');
  v_phone  text  := nullif(right(regexp_replace(coalesce(c->>'phone',''), '\D', '', 'g'), 10), '');
  v_company text := nullif(trim(c->>'company_name'), '');
  v_person  text := nullif(trim(c->>'person_name'), '');
  v_channel text := nullif(trim(i->>'source_channel'), '');
  v_ref     text := nullif(trim(i->>'source_ref'), '');
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
  if v_email like 'auto+%@urbanstone.co' or v_email like 'run-report+%' then v_email := null; end if;
  if v_phone like '000000%' then v_phone := null; end if;
  if v_company is null and v_person is null then
    v_person := coalesce(v_email, c->>'phone', 'Unknown');
  end if;

  -- 1) contact match: email, then phone, then exact company name (case-insensitive)
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
      values (coalesce(nullif(c->>'contact_type',''), 'unknown'), v_company, v_person, v_email, nullif(trim(c->>'phone'),''),
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
      phone   = coalesce(t.phone, nullif(trim(c->>'phone'),'')),
      address = coalesce(t.address, nullif(c->>'address','')),
      city    = coalesce(t.city, nullif(c->>'city','')),
      state   = coalesce(t.state, nullif(c->>'state','')),
      zip     = coalesce(t.zip, nullif(c->>'zip','')),
      contact_type = case when t.contact_type = 'unknown' and coalesce(c->>'contact_type','') <> '' then c->>'contact_type' else t.contact_type end
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
              coalesce(nullif(i->>'received_at','')::timestamptz, now()),
              nullif(i->>'project_address',''), nullif(i->>'project_city',''), nullif(i->>'project_state',''),
              nullif(i->>'project_zip',''), nullif(i->>'scope',''), nullif(i->>'valuation','')::numeric, i->'raw')
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

create or replace function public.crm_keepalive()
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'at', now(), 'contacts', (select count(*) from crm.contacts));
$$;

revoke all on function public.crm_ingest_intake(jsonb) from public, anon, authenticated;
revoke all on function public.crm_keepalive() from public, anon, authenticated;
grant execute on function public.crm_ingest_intake(jsonb) to service_role;
grant execute on function public.crm_keepalive() to service_role;
