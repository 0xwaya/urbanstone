-- Phase 1+2: CRM review requests + token-verified (no OAuth required) review flow.
-- Every RPC below is SECURITY DEFINER. Public ones are gated by the one-time
-- invite token digest; admin ones by the SHA-256 of REVIEW_INVITE_ADMIN_SECRET
-- stored in public.review_admin_config. Tables stay closed to anon/authenticated.

create table if not exists public.review_admin_config (
    id boolean primary key default true check (id),
    admin_secret_sha256 text not null check (admin_secret_sha256 ~ '^[0-9a-f]{64}$'),
    updated_at timestamptz not null default now()
);
alter table public.review_admin_config enable row level security;
revoke all on public.review_admin_config from anon, authenticated;

alter table public.customer_reviews add column if not exists job_label text;
alter table public.customer_reviews add column if not exists location text;

create table if not exists crm.review_requests (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid unique references crm.quotes(id) on delete cascade,
    intake_id uuid references crm.intakes(id) on delete set null,
    contact_id uuid not null references crm.contacts(id) on delete cascade,
    status text not null default 'eligible'
        check (status in ('eligible', 'approved', 'sent', 'reviewed', 'declined')),
    job_label text,
    location text,
    invite_id uuid references public.review_invites(id) on delete set null,
    review_id uuid references public.customer_reviews(id) on delete set null,
    approved_at timestamptz,
    sent_at timestamptz,
    sent_via text check (sent_via in ('resend', 'manual')),
    reviewed_at timestamptz,
    declined_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists review_requests_status_idx on crm.review_requests (status);
alter table crm.review_requests enable row level security;
revoke all on crm.review_requests from anon, authenticated;
grant select, insert, update, delete on crm.review_requests to service_role;

-- "Kitchen countertops (46 sq ft) + double vanity (13 sq ft), Quartz" -> "Kitchen countertops & double vanity"
create or replace function crm.review_job_label(p_scope text, p_material text)
returns text language sql immutable set search_path = pg_catalog as $$
    select nullif(left(trim(replace(split_part(regexp_replace(coalesce(nullif(p_scope, ''), p_material, ''),
        '\s*\([^)]*\)', '', 'g'), ',', 1), ' + ', ' & ')), 80), '')
$$;

create or replace function crm.review_request_from_quote()
returns trigger language plpgsql security definer set search_path = crm, public, pg_temp as $$
begin
    if new.status = 'closed' and coalesce(new.balance_due, 0) = 0
       and coalesce(new.amount_paid, 0) > 0 and new.contact_id is not null then
        insert into crm.review_requests (quote_id, intake_id, contact_id, job_label, location)
        select new.id, new.intake_id, new.contact_id,
               crm.review_job_label(i.scope, new.material_summary),
               nullif(concat_ws(', ', coalesce(i.project_city, c.city), coalesce(i.project_state, c.state)), '')
          from crm.contacts c
          left join crm.intakes i on i.id = new.intake_id
         where c.id = new.contact_id
        on conflict (quote_id) do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists quotes_review_request on crm.quotes;
create trigger quotes_review_request
    after insert or update of status, balance_due, amount_paid on crm.quotes
    for each row execute function crm.review_request_from_quote();

-- Backfill: fully paid, closed quotes become eligible.
insert into crm.review_requests (quote_id, intake_id, contact_id, job_label, location)
select q.id, q.intake_id, q.contact_id,
       crm.review_job_label(i.scope, q.material_summary),
       nullif(concat_ws(', ', coalesce(i.project_city, c.city), coalesce(i.project_state, c.state)), '')
  from crm.quotes q
  join crm.contacts c on c.id = q.contact_id
  left join crm.intakes i on i.id = q.intake_id
 where q.status = 'closed' and coalesce(q.balance_due, 0) = 0 and coalesce(q.amount_paid, 0) > 0
on conflict (quote_id) do nothing;

create or replace function public.review_admin_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
    select exists (
        select 1 from public.review_admin_config
         where length(coalesce(p_secret, '')) >= 32
           and admin_secret_sha256 = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex')
    )
$$;

create or replace function public.review_admin_assert(p_secret text)
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
    if not public.review_admin_ok(p_secret) then
        raise exception 'unauthorized' using errcode = '28000';
    end if;
end;
$$;

-- "Merilee Clay" -> "Merilee C."
create or replace function public.review_public_name(p_name text)
returns text language sql immutable set search_path = pg_catalog as $$
    select case
        when array_length(regexp_split_to_array(trim(coalesce(p_name, '')), '\s+'), 1) > 1
        then (regexp_split_to_array(trim(p_name), '\s+'))[1] || ' '
             || upper(left((regexp_split_to_array(trim(p_name), '\s+'))[array_length(regexp_split_to_array(trim(p_name), '\s+'), 1)], 1)) || '.'
        else nullif(trim(coalesce(p_name, '')), '')
    end
$$;

create or replace function public.review_admin_list(p_secret text)
returns json language plpgsql stable security definer set search_path = crm, public, pg_temp as $$
begin
    perform public.review_admin_assert(p_secret);
    return json_build_object(
        'requests', coalesce((
            select json_agg(r order by r.created_at desc) from (
                select rr.id, rr.status, rr.job_label, rr.location, rr.created_at, rr.approved_at,
                       rr.sent_at, rr.sent_via, rr.reviewed_at, q.quote_number,
                       coalesce(c.person_name, c.company_name) as customer_name, c.email as customer_email,
                       inv.expires_at as invite_expires_at
                  from crm.review_requests rr
                  join crm.contacts c on c.id = rr.contact_id
                  left join crm.quotes q on q.id = rr.quote_id
                  left join public.review_invites inv on inv.id = rr.invite_id
            ) r), '[]'::json),
        'reviews', coalesce((
            select json_agg(v order by v.submitted_at desc) from (
                select id, display_name, rating, review_text, job_label, location, status,
                       submitted_at, published_at
                  from public.customer_reviews
                 where status in ('pending', 'published')
            ) v), '[]'::json)
    );
end;
$$;

-- Approve: creates the one-time invite. Refuses once a request was sent/reviewed/declined.
create or replace function public.review_admin_issue_invite(
    p_secret text, p_request_id uuid, p_token_hash text, p_email_hash text, p_expires_at timestamptz
) returns json language plpgsql security definer set search_path = crm, public, pg_temp as $$
declare
    v_req crm.review_requests%rowtype;
    v_invite uuid;
    v_name text;
    v_email text;
begin
    perform public.review_admin_assert(p_secret);
    select * into v_req from crm.review_requests where id = p_request_id for update;
    if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
    if v_req.status not in ('eligible', 'approved') then
        raise exception 'request already %', v_req.status using errcode = 'P0001';
    end if;
    select coalesce(person_name, company_name), email into v_name, v_email
      from crm.contacts where id = v_req.contact_id;
    if v_email is null then raise exception 'contact has no email' using errcode = 'P0003'; end if;

    update public.review_invites set revoked_at = now()
     where customer_reference = 'rr:' || p_request_id and used_at is null and revoked_at is null;
    insert into public.review_invites (token_hash, eligible_email_hash, customer_reference, expires_at)
    values (p_token_hash, p_email_hash, 'rr:' || p_request_id, p_expires_at)
    returning id into v_invite;

    update crm.review_requests
       set status = 'approved', invite_id = v_invite, approved_at = now(), updated_at = now()
     where id = p_request_id;

    return json_build_object('customer_name', v_name, 'customer_email', v_email,
        'job_label', v_req.job_label, 'location', v_req.location);
end;
$$;

-- Marks a request sent exactly once and logs it to crm.communications.
create or replace function public.review_admin_mark_sent(
    p_secret text, p_request_id uuid, p_via text, p_subject text, p_from text, p_note text
) returns json language plpgsql security definer set search_path = crm, public, pg_temp as $$
declare
    v_req crm.review_requests%rowtype;
    v_email text;
begin
    perform public.review_admin_assert(p_secret);
    if p_via not in ('resend', 'manual') then raise exception 'invalid channel' using errcode = '22023'; end if;
    select * into v_req from crm.review_requests where id = p_request_id for update;
    if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
    if v_req.status <> 'approved' or v_req.invite_id is null or v_req.sent_at is not null then
        raise exception 'request is not awaiting send' using errcode = 'P0001';
    end if;
    select email into v_email from crm.contacts where id = v_req.contact_id;

    update crm.review_requests
       set status = 'sent', sent_at = now(), sent_via = p_via, updated_at = now()
     where id = p_request_id;

    insert into crm.communications (contact_id, intake_id, direction, channel, from_addr, to_addr,
                                    subject, sent_at, status, notes)
    values (v_req.contact_id, v_req.intake_id, 'outbound', 'email', p_from, v_email,
            left(p_subject, 300), now(), 'sent',
            left(concat_ws(' | ', 'Review invite', 'via ' || p_via, nullif(p_note, '')), 500));

    return json_build_object('id', p_request_id, 'status', 'sent');
end;
$$;

create or replace function public.review_admin_decline(p_secret text, p_request_id uuid)
returns json language plpgsql security definer set search_path = crm, public, pg_temp as $$
begin
    perform public.review_admin_assert(p_secret);
    update crm.review_requests set status = 'declined', declined_at = now(), updated_at = now()
     where id = p_request_id and status in ('eligible', 'approved');
    if not found then raise exception 'request cannot be declined' using errcode = 'P0001'; end if;
    update public.review_invites set revoked_at = now()
     where customer_reference = 'rr:' || p_request_id and used_at is null and revoked_at is null;
    return json_build_object('id', p_request_id, 'status', 'declined');
end;
$$;

create or replace function public.review_admin_moderate(p_secret text, p_review_id uuid, p_status text)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
begin
    perform public.review_admin_assert(p_secret);
    if p_status not in ('published', 'rejected') then raise exception 'invalid status' using errcode = '22023'; end if;
    update public.customer_reviews
       set status = p_status, published_at = case when p_status = 'published' then now() end
     where id = p_review_id and status in ('pending', 'published');
    if not found then raise exception 'review not found' using errcode = 'P0002'; end if;
    return json_build_object('id', p_review_id, 'status', p_status);
end;
$$;

-- Public: validates an invite token and returns only what the form needs to prefill.
create or replace function public.review_invite_lookup(p_token_hash text)
returns json language plpgsql stable security definer set search_path = crm, public, pg_temp as $$
declare v json;
begin
    select json_build_object(
               'first_name', split_part(trim(coalesce(c.person_name, c.company_name, '')), ' ', 1),
               'display_name', public.review_public_name(coalesce(c.person_name, c.company_name)),
               'email', c.email, 'job_label', rr.job_label, 'location', rr.location,
               'expires_at', inv.expires_at)
      into v
      from public.review_invites inv
      join crm.review_requests rr on rr.invite_id = inv.id
      join crm.contacts c on c.id = rr.contact_id
     where inv.token_hash = p_token_hash and inv.used_at is null
       and inv.revoked_at is null and inv.expires_at > now();
    return v;
end;
$$;

-- Public: the invite token is the verification (no Google sign-in required).
create or replace function public.review_submit_by_token(
    p_token_hash text, p_display_name text, p_rating smallint, p_review_text text
) returns json language plpgsql security definer set search_path = crm, public, pg_temp as $$
declare
    v_invite public.review_invites%rowtype;
    v_req crm.review_requests%rowtype;
    v_review uuid;
begin
    select * into v_invite from public.review_invites
     where token_hash = p_token_hash and used_at is null and revoked_at is null and expires_at > now()
     for update;
    if not found then raise exception 'invalid or expired review invitation' using errcode = 'P0001'; end if;
    select * into v_req from crm.review_requests where invite_id = v_invite.id for update;

    insert into public.customer_reviews (invite_id, customer_reference, display_name, rating,
                                         review_text, status, job_label, location)
    values (v_invite.id, v_invite.customer_reference, p_display_name, p_rating, p_review_text,
            'pending', v_req.job_label, v_req.location)
    returning id into v_review;

    update public.review_invites set used_at = now() where id = v_invite.id;
    if v_req.id is not null then
        update crm.review_requests
           set status = 'reviewed', review_id = v_review, reviewed_at = now(), updated_at = now()
         where id = v_req.id;
    end if;
    return json_build_object('review_id', v_review, 'status', 'pending');
end;
$$;

create or replace function public.reviews_published()
returns table (id uuid, display_name text, rating smallint, review_text text,
               job_label text, location text, published_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
    select r.id, public.review_public_name(r.display_name), r.rating, r.review_text,
           r.job_label, r.location, coalesce(r.published_at, r.submitted_at)
      from public.customer_reviews r
     where r.status = 'published'
     order by coalesce(r.published_at, r.submitted_at) desc
     limit 30
$$;

do $$
declare f text;
begin
    foreach f in array array[
        'public.review_admin_list(text)',
        'public.review_admin_issue_invite(text, uuid, text, text, timestamptz)',
        'public.review_admin_mark_sent(text, uuid, text, text, text, text)',
        'public.review_admin_decline(text, uuid)',
        'public.review_admin_moderate(text, uuid, text)',
        'public.review_invite_lookup(text)',
        'public.review_submit_by_token(text, text, smallint, text)',
        'public.reviews_published()'
    ] loop
        execute format('revoke all on function %s from public', f);
        execute format('grant execute on function %s to anon, authenticated, service_role', f);
    end loop;
    foreach f in array array['public.review_admin_ok(text)', 'public.review_admin_assert(text)',
                             'crm.review_request_from_quote()'] loop
        execute format('revoke all on function %s from public, anon, authenticated', f);
    end loop;
end;
$$;
