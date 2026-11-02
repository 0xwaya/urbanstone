-- Contractor sign-up hardening: manual approval, email verification, risk flags.
alter table public.contractors
    add column if not exists status text not null default 'pending',
    add column if not exists email_verified boolean not null default false,
    add column if not exists email_verified_at timestamptz,
    add column if not exists verification_token_hash text,
    add column if not exists verification_expires_at timestamptz,
    add column if not exists risk_flags text[] not null default '{}',
    add column if not exists reviewed_at timestamptz;

do $$ begin
    alter table public.contractors
        add constraint contractors_status_check check (status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

update public.contractors set status = 'approved' where approved = true and status = 'pending';

create index if not exists contractors_verification_token_hash_idx
    on public.contractors (verification_token_hash) where verification_token_hash is not null;
