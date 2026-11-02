-- CRM phase three: Job Board (Mon Nov 2, 2026, ET). Additive only.
-- crm.jobs (one row per job, links contact/intake/quote), crm.finder_fees ($100 owed to the
-- referring cabinet contractor once a referred job reaches Deposit In), plus admin RPCs gated by
-- the same admin key as /admin/reviews (public.review_admin_assert). Tables stay closed to anon/authenticated.

create table if not exists crm.jobs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    contact_id uuid not null references crm.contacts(id) on delete cascade,
    intake_id uuid references crm.intakes(id) on delete set null,
    quote_id uuid unique references crm.quotes(id) on delete set null,
    title text,
    stage text not null default 'new_lead' check (stage in
        ('new_lead','quoted','deposit_in','templated','fabrication','installed','paid','lost')),
    stage_changed_at timestamptz not null default now(),
    deposit_at timestamptz,
    deposit_amount numeric(10,2),
    schedule_window text check (schedule_window in ('expedite_ok','standard')),
    template_date date,
    install_date date,
    paid_at timestamptz,
    referred_by text,
    notes text
);
create index if not exists jobs_stage_idx on crm.jobs (stage);
create index if not exists jobs_install_idx on crm.jobs (install_date);
create index if not exists jobs_contact_idx on crm.jobs (contact_id);
create index if not exists jobs_intake_idx on crm.jobs (intake_id);

create table if not exists crm.finder_fees (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    job_id uuid not null unique references crm.jobs(id) on delete cascade,
    partner_name text not null,
    amount numeric(10,2) not null default 100.00,
    status text not null default 'owed' check (status in ('owed','paid')),
    paid_at timestamptz,
    notes text
);

alter table crm.jobs enable row level security;
alter table crm.finder_fees enable row level security;
revoke all on crm.jobs, crm.finder_fees from anon, authenticated;
grant select, insert, update, delete on crm.jobs, crm.finder_fees to service_role;

-- Guardrail: deposit landing Thu/Fri/Sat/Sun (America/New_York) => 'standard' window (no same-week expedite).
create or replace function crm.job_deposit_window(p_at timestamptz)
returns text language sql immutable set search_path = pg_catalog as $$
    select case when p_at is null then null
                when extract(isodow from (p_at at time zone 'America/New_York')) >= 4 then 'standard'
                else 'expedite_ok' end
$$;

create or replace function crm.jobs_before_write()
returns trigger language plpgsql set search_path = crm, pg_temp as $$
declare
    v_order text[] := array['new_lead','quoted','deposit_in','templated','fabrication','installed','paid'];
begin
    new.updated_at := now();
    if tg_op = 'INSERT' or new.stage is distinct from old.stage then
        new.stage_changed_at := now();
    end if;
    -- reaching Deposit In (or later) without a date: stamp now
    if new.deposit_at is null and array_position(v_order, new.stage) >= 3 and new.stage <> 'paid'
       and tg_op = 'UPDATE' and new.stage is distinct from old.stage then
        new.deposit_at := now();
    end if;
    if tg_op = 'UPDATE' and new.stage = 'paid' and old.stage <> 'paid' and new.paid_at is null then new.paid_at := now(); end if;
    if tg_op = 'INSERT' or new.deposit_at is distinct from old.deposit_at then
        new.schedule_window := crm.job_deposit_window(new.deposit_at);
    end if;
    return new;
end $$;
drop trigger if exists jobs_before_write on crm.jobs;
create trigger jobs_before_write before insert or update on crm.jobs
    for each row execute function crm.jobs_before_write();

create or replace function crm.jobs_finder_fee()
returns trigger language plpgsql security definer set search_path = crm, pg_temp as $$
begin
    if new.stage in ('deposit_in','templated','fabrication','installed','paid')
       and nullif(trim(coalesce(new.referred_by, '')), '') is not null then
        insert into crm.finder_fees (job_id, partner_name) values (new.id, trim(new.referred_by))
        on conflict (job_id) do nothing;
    end if;
    return null;
end $$;
drop trigger if exists jobs_finder_fee on crm.jobs;
create trigger jobs_finder_fee after insert or update of stage, referred_by on crm.jobs
    for each row execute function crm.jobs_finder_fee();

-- Admin RPCs (same key as /admin/reviews)
create or replace function public.job_admin_list(p_secret text)
returns json language plpgsql stable security definer set search_path = crm, public, pg_temp as $$
begin
    perform public.review_admin_assert(p_secret);
    return json_build_object(
        'jobs', coalesce((select json_agg(j order by j.install_date nulls last, j.created_at) from (
            select jb.id, jb.title, jb.stage, jb.stage_changed_at, jb.deposit_at, jb.deposit_amount,
                   jb.schedule_window, jb.template_date, jb.install_date, jb.paid_at, jb.referred_by, jb.notes,
                   coalesce(c.person_name, c.company_name) as customer_name, c.phone, c.email,
                   coalesce(i.project_city, c.city) as city, i.scope,
                   q.quote_number, q.version as quote_version, q.total, q.amount_paid, q.balance_due, q.status as quote_status,
                   f.id as fee_id, f.partner_name as fee_partner, f.amount as fee_amount, f.status as fee_status, f.paid_at as fee_paid_at
              from crm.jobs jb
              join crm.contacts c on c.id = jb.contact_id
              left join crm.intakes i on i.id = jb.intake_id
              left join crm.quotes q on q.id = jb.quote_id
              left join crm.finder_fees f on f.job_id = jb.id) j), '[]'::json),
        'open_quotes', coalesce((select json_agg(x order by x.quote_number) from (
            select q.quote_number, q.version, q.status, q.total, coalesce(c.person_name, c.company_name) as customer_name
              from crm.quotes q join crm.contacts c on c.id = q.contact_id
             where not exists (select 1 from crm.jobs jb where jb.quote_id = q.id) and q.status <> 'lost') x), '[]'::json)
    );
end $$;

create or replace function public.job_admin_update(p_secret text, p_job_id uuid, p_patch jsonb)
returns json language plpgsql security definer set search_path = crm, public, pg_temp as $$
declare v crm.jobs;
begin
    perform public.review_admin_assert(p_secret);
    update crm.jobs set
        stage = case when p_patch ? 'stage' then p_patch->>'stage' else stage end,
        deposit_at = case when p_patch ? 'deposit_at' then nullif(p_patch->>'deposit_at','')::timestamptz else deposit_at end,
        deposit_amount = case when p_patch ? 'deposit_amount' then nullif(p_patch->>'deposit_amount','')::numeric else deposit_amount end,
        template_date = case when p_patch ? 'template_date' then nullif(p_patch->>'template_date','')::date else template_date end,
        install_date = case when p_patch ? 'install_date' then nullif(p_patch->>'install_date','')::date else install_date end,
        referred_by = case when p_patch ? 'referred_by' then nullif(left(trim(p_patch->>'referred_by'),120),'') else referred_by end,
        notes = case when p_patch ? 'notes' then left(p_patch->>'notes', 2000) else notes end
     where id = p_job_id returning * into v;
    if v.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
    return row_to_json(v);
end $$;

create or replace function public.job_admin_create_from_quote(p_secret text, p_quote_number text)
returns json language plpgsql security definer set search_path = crm, public, pg_temp as $$
declare v crm.jobs; q crm.quotes;
begin
    perform public.review_admin_assert(p_secret);
    select * into q from crm.quotes where quote_number = p_quote_number;
    if q.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
    insert into crm.jobs (contact_id, intake_id, quote_id, title, stage, referred_by)
    select q.contact_id, q.intake_id, q.id, crm.review_job_label(i.scope, q.material_summary),
           case when q.status in ('sent','closed') then 'quoted' else 'new_lead' end,
           (select referred_by from crm.contacts where id = q.contact_id and finder_fee_amount is not null)
      from (select 1) s left join crm.intakes i on i.id = q.intake_id
    returning * into v;
    return row_to_json(v);
exception when unique_violation then
    raise exception 'A job already exists for this quote.' using errcode = 'P0001';
end $$;

create or replace function public.job_admin_fee_set(p_secret text, p_fee_id uuid, p_paid boolean)
returns json language plpgsql security definer set search_path = crm, public, pg_temp as $$
declare f crm.finder_fees;
begin
    perform public.review_admin_assert(p_secret);
    update crm.finder_fees set status = case when p_paid then 'paid' else 'owed' end,
           paid_at = case when p_paid then coalesce(paid_at, now()) else null end
     where id = p_fee_id returning * into f;
    if f.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
    return row_to_json(f);
end $$;

do $$
declare f text;
begin
    foreach f in array array['public.job_admin_list(text)','public.job_admin_update(text,uuid,jsonb)',
                             'public.job_admin_create_from_quote(text,text)','public.job_admin_fee_set(text,uuid,boolean)'] loop
        execute format('revoke all on function %s from public', f);
        execute format('grant execute on function %s to anon, authenticated, service_role', f);
    end loop;
    foreach f in array array['crm.jobs_before_write()','crm.jobs_finder_fee()','crm.job_deposit_window(timestamptz)'] loop
        execute format('revoke all on function %s from public, anon, authenticated', f);
    end loop;
end $$;

-- Seed: only jobs whose data is already in the CRM.
-- Merilee Clay USC-Q-1047: installed and paid in full (closed, balance 0). Deposit/install dates not on file -> left null.
insert into crm.jobs (contact_id, intake_id, quote_id, title, stage, paid_at, notes)
select q.contact_id, q.intake_id, q.id, crm.review_job_label(i.scope, q.material_summary), 'paid', null,
       'Seeded from CRM: installed, paid in full (USC-Q-1047). Deposit and install dates not on file.'
  from crm.quotes q left join crm.intakes i on i.id = q.intake_id
 where q.quote_number = 'USC-Q-1047'
on conflict (quote_id) do nothing;
-- Katie Bedel USC-Q-1050 (sent Oct 30): quoted. Referred by a cabinet contractor (name TBD) -> fee logs at Deposit In.
insert into crm.jobs (contact_id, intake_id, quote_id, title, stage, referred_by, notes)
select q.contact_id, q.intake_id, q.id, crm.review_job_label(i.scope, q.material_summary), 'quoted', c.referred_by,
       'Seeded from CRM: USC-Q-1050 v3 sent Oct 30 (1048/1049 are earlier drafts).'
  from crm.quotes q join crm.contacts c on c.id = q.contact_id left join crm.intakes i on i.id = q.intake_id
 where q.quote_number = 'USC-Q-1050'
on conflict (quote_id) do nothing;
