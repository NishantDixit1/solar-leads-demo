-- Solar lead CRM: schema, row level security and seed helpers.
-- Run this once in the Supabase SQL editor.

create type lead_stage as enum ('new', 'contacted', 'signed');

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 120),
  email       text,
  phone       text,
  address     text,
  source      text,
  roof_size   text,
  notes       text,
  stage       lead_stage not null default 'new',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index leads_user_id_created_at_idx on public.leads (user_id, created_at desc);

-- Owner is decided by the database, never by the request body.
-- auth.uid() is null for the service role, which is how the local seed script
-- inserts rows on behalf of each test account. Any signed in user goes down
-- the first branch, so a forged user_id in a request body is always discarded.
create or replace function public.set_lead_owner()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(auth.uid(), new.user_id);
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger leads_set_owner
  before insert on public.leads
  for each row execute function public.set_lead_owner();

-- user_id and created_at can never be changed by an update.
create or replace function public.freeze_lead_owner()
returns trigger
language plpgsql
as $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger leads_freeze_owner
  before update on public.leads
  for each row execute function public.freeze_lead_owner();

-- Row level security. Without a matching policy Postgres returns zero rows,
-- so the default for any request we did not think of is "see nothing".
alter table public.leads enable row level security;

create policy leads_select_own on public.leads
  for select using (auth.uid() = user_id);

create policy leads_insert_own on public.leads
  for insert with check (auth.uid() = user_id);

create policy leads_update_own on public.leads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy leads_delete_own on public.leads
  for delete using (auth.uid() = user_id);

-- The anon and authenticated roles reach this table only through RLS.
grant select, insert, update, delete on public.leads to authenticated;
