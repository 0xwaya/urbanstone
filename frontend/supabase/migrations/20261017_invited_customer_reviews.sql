-- Invite-only, first-party customer reviews. Google OAuth is used only to verify
-- the customer's Google identity; this flow never posts to Google/Maps.

create table if not exists public.review_invites (
    id uuid primary key default gen_random_uuid(),
    token_hash text not null unique check (length(token_hash) = 64),
    eligible_email_hash text not null check (length(eligible_email_hash) = 64),
    customer_reference text not null check (length(customer_reference) between 1 and 128),
    expires_at timestamptz not null,
    used_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create unique index if not exists review_invites_one_active_per_reference
    on public.review_invites (customer_reference)
    where used_at is null and revoked_at is null;

create table if not exists public.customer_reviews (
    id uuid primary key default gen_random_uuid(),
    invite_id uuid not null unique references public.review_invites(id),
    customer_reference text not null unique,
    display_name text not null check (length(display_name) between 1 and 80),
    rating smallint not null check (rating between 1 and 5),
    review_text text not null check (length(review_text) between 20 and 2000),
    status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
    submitted_at timestamptz not null default now(),
    published_at timestamptz
);

alter table public.review_invites enable row level security;
alter table public.customer_reviews enable row level security;

revoke all on public.review_invites from anon, authenticated;
revoke all on public.customer_reviews from anon, authenticated;
grant select, insert, update on public.review_invites to service_role;
grant select, insert, update on public.customer_reviews to service_role;

create or replace function public.create_review_invite(
    p_token_hash text,
    p_eligible_email_hash text,
    p_customer_reference text,
    p_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_invite_id uuid;
begin
    if exists (
        select 1 from public.customer_reviews
        where customer_reference = p_customer_reference
    ) then
        raise exception 'review already submitted for this customer reference' using errcode = 'P0001';
    end if;

    update public.review_invites
       set revoked_at = now()
     where customer_reference = p_customer_reference
       and used_at is null
       and revoked_at is null;

    insert into public.review_invites (
        token_hash, eligible_email_hash, customer_reference, expires_at
    ) values (
        p_token_hash, p_eligible_email_hash, p_customer_reference, p_expires_at
    ) returning id into v_invite_id;

    return v_invite_id;
end;
$$;

create or replace function public.submit_invited_review(
    p_token_hash text,
    p_eligible_email_hash text,
    p_display_name text,
    p_rating smallint,
    p_review_text text
) returns table (review_id uuid, review_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_invite public.review_invites%rowtype;
    v_review_id uuid;
begin
    select * into v_invite
      from public.review_invites
     where token_hash = p_token_hash
       and eligible_email_hash = p_eligible_email_hash
       and revoked_at is null
       and used_at is null
       and expires_at > now()
     for update;

    if not found then
        raise exception 'invalid or expired review invitation' using errcode = 'P0001';
    end if;

    insert into public.customer_reviews (
        invite_id, customer_reference, display_name, rating, review_text, status
    ) values (
        v_invite.id, v_invite.customer_reference, p_display_name, p_rating, p_review_text, 'pending'
    ) returning id into v_review_id;

    update public.review_invites set used_at = now() where id = v_invite.id;

    return query select v_review_id, 'pending'::text;
end;
$$;

revoke all on function public.create_review_invite(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.submit_invited_review(text, text, text, smallint, text) from public, anon, authenticated;
grant execute on function public.create_review_invite(text, text, text, timestamptz) to service_role;
grant execute on function public.submit_invited_review(text, text, text, smallint, text) to service_role;
