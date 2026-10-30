-- Urban Stone Collective CRM v1 — schema "crm" in Supabase project "urbanstone"
-- Created Fri Oct 30, 2026 (ET). RLS on every table, no policies: only the service role / dashboard can read or write.
create schema if not exists crm;
revoke all on schema crm from anon, authenticated;

-- 1. contacts: one row per person or company (dedupe on normalized email / phone)
create table crm.contacts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  contact_type    text not null default 'unknown'
                  check (contact_type in ('contractor','homeowner','designer','architect','property_manager','referral_partner','unknown')),
  company_name    text,
  person_name     text,
  email           text,
  phone           text,              -- as written
  address         text, city text, state text, zip text,
  email_norm      text generated always as (nullif(lower(trim(email)),'')) stored,
  phone_norm      text generated always as (nullif(right(regexp_replace(coalesce(phone,''),'\D','','g'),10),'')) stored,
  first_source    text,              -- channel where we first met them
  referred_by     text,              -- e.g. cabinet contractor name (finder's fee, crm-design §14)
  finder_fee_amount numeric(10,2),
  finder_fee_status text not null default 'n/a' check (finder_fee_status in ('owed','paid','n/a')),
  notes           text,
  constraint contact_has_name check (company_name is not null or person_name is not null)
);
create unique index contacts_email_uq on crm.contacts (email_norm) where email_norm is not null;
create index contacts_phone_idx on crm.contacts (phone_norm);

-- 2. intakes: every time a lead/project shows up (permit, web form, chat, referral, call...)
create table crm.intakes (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  contact_id      uuid not null references crm.contacts(id) on delete cascade,
  source_channel  text not null check (source_channel in
                  ('lead_sourcer','website_form','website_chat','contractor_estimate','outreach','quote','referral','phone','sms','email','walk_in','manual')),
  sub_source      text,              -- permit_cincinnati | permit_hamilton | permit_butler | ...
  source_ref      text,              -- permit number, quote number, form dedupe key
  source_run      text,              -- e.g. lead sourcer run time / GH run id
  received_at     timestamptz,
  project_address text, project_city text, project_state text, project_zip text,
  scope           text,
  valuation       numeric(12,2),     -- permit valuation (not our price)
  triage_tag      text check (triage_tag in ('green','orange','red') or triage_tag is null),  -- Edward's Outlook color tag
  stage           text not null default 'new_lead' check (stage in
                  ('new_lead','contacted','visit_scheduled','quoted','deposit_in','templated','installed','final_payment','closed_won','closed_lost','cold','skipped')),
  status_note     text,
  raw             jsonb
);
create unique index intakes_source_ref_uq on crm.intakes (source_channel, source_ref) where source_ref is not null;
create index intakes_contact_idx on crm.intakes (contact_id);

-- 3. communications: every email/call/text in or out
create table crm.communications (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  contact_id      uuid not null references crm.contacts(id) on delete cascade,
  intake_id       uuid references crm.intakes(id) on delete set null,
  direction       text not null check (direction in ('outbound','inbound')),
  channel         text not null check (channel in ('email','phone','sms','voicemail','in_person','chat','other')),
  from_addr       text, to_addr text,
  subject         text,
  sent_at         timestamptz,       -- null = time not recorded
  status          text not null default 'sent' check (status in ('draft','sent','received','failed')),
  file_ref        text,              -- local draft file
  notes           text
);
create index comms_contact_idx on crm.communications (contact_id);

-- 4. quotes
create table crm.quotes (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  quote_number    text not null unique check (quote_number ~ '^USC-Q-[0-9]{4,}$'),
  version         text,              -- e.g. v7
  contact_id      uuid not null references crm.contacts(id),
  intake_id       uuid references crm.intakes(id),
  customer_name   text,
  job_address     text,              -- or see intake.project_address
  quote_date      date,
  sent_at         timestamptz,
  material_summary text,
  sq_ft           numeric(8,2),
  subtotal        numeric(10,2),
  tax_rate        numeric(6,4),
  tax_amount      numeric(10,2),
  total           numeric(10,2),
  card_fee        numeric(10,2),
  card_total      numeric(10,2),
  cash_zelle_total numeric(10,2),
  status          text not null default 'draft' check (status in ('draft','sent','closed','lost')),
  payment_method  text,
  amount_paid     numeric(10,2),
  balance_due     numeric(10,2),
  source          text,              -- intake channel it came from
  related_quote   text,              -- e.g. 1049 is an alternate of 1048
  pdf_path        text,
  notes           text
);
create index quotes_contact_idx on crm.quotes (contact_id);

-- 5. quote line items
create table crm.quote_line_items (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references crm.quotes(id) on delete cascade,
  line_order      int not null,
  item_type       text not null check (item_type in
                  ('material','slab','fabrication','install','countertop_installed','sink','cutout','edge','backsplash','tear_out','cabinet','fee','discount','tax','promo','other')),
  product_name    text,
  supplier_brand  text,
  color           text,
  thickness_finish text,
  quantity        numeric(10,2),
  unit            text check (unit in ('sq_ft','each','linear_ft','slab','job') or unit is null),
  unit_price      numeric(10,2),
  line_total      numeric(10,2),
  shown_on_quote  boolean not null default true,  -- false = internal build line, not printed on the PDF
  notes           text,
  unique (quote_id, line_order)
);

-- updated_at trigger for contacts
create or replace function crm.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger contacts_touch before update on crm.contacts for each row execute function crm.touch_updated_at();

-- RLS: on, no policies (anon/authenticated get nothing)
alter table crm.contacts         enable row level security;
alter table crm.intakes          enable row level security;
alter table crm.communications   enable row level security;
alter table crm.quotes           enable row level security;
alter table crm.quote_line_items enable row level security;
revoke all on all tables in schema crm from anon, authenticated;

-- 6. handy view: contacts with intake counts + repeat flag
create view crm.contact_summary with (security_invoker = true) as
select c.id, c.company_name, c.person_name, c.contact_type, c.email, c.phone,
       count(distinct i.id) as intake_count,
       count(distinct i.id) > 1 as is_repeat,
       count(distinct m.id) filter (where m.direction='outbound' and m.status='sent') as emails_sent,
       max(m.sent_at) as last_touch_at,
       count(distinct q.id) as quote_count
from crm.contacts c
left join crm.intakes i on i.contact_id = c.id
left join crm.communications m on m.contact_id = c.id
left join crm.quotes q on q.contact_id = c.id
group by c.id;
revoke all on crm.contact_summary from anon, authenticated;
