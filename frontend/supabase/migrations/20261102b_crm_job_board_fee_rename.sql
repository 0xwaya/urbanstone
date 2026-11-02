-- Review fix (Nov 2, 2026 ET): if referred_by is corrected after a fee was logged, keep an unpaid fee's partner name in sync. Still one fee per job.
create or replace function crm.jobs_finder_fee()
returns trigger language plpgsql security definer set search_path = crm, pg_temp as $$
begin
    if new.stage in ('deposit_in','templated','fabrication','installed','paid')
       and nullif(trim(coalesce(new.referred_by, '')), '') is not null then
        insert into crm.finder_fees (job_id, partner_name) values (new.id, trim(new.referred_by))
        on conflict (job_id) do update set partner_name = excluded.partner_name
            where crm.finder_fees.status = 'owed';
    end if;
    return null;
end $$;
revoke all on function crm.jobs_finder_fee() from public, anon, authenticated;
