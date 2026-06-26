create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  full_name text,
  email text unique,
  phone text,
  role text not null default 'intern' check (role in ('intern','operator','mechanic','administrator')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists usines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  responsable text,
  sector text,
  creation_date date,
  image_url text,
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists chaines (
  id uuid primary key default gen_random_uuid(),
  usine_id uuid not null references usines(id) on delete cascade,
  name text not null,
  responsable text,
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists machines (
  id uuid primary key default gen_random_uuid(),
  usine_id uuid references usines(id) on delete set null,
  chaine_id uuid references chaines(id) on delete cascade,
  name text not null,
  type text,
  manufacturer text,
  responsable text,
  image_url text,
  status text not null default 'running' check (status in ('running','maintenance','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists chaine_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  chaine_id uuid references chaines(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique(profile_id, chaine_id)
);

create table if not exists machine_components (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete cascade,
  name text not null,
  criticality text default 'medium',
  created_at timestamptz not null default now()
);

create table if not exists interventions (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete cascade,
  chaine_id uuid references chaines(id) on delete set null,
  title text not null,
  type text not null default 'preventive',
  occurrence text,
  scheduled_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','done','overdue','cancelled')),
  completed_at timestamptz,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists failures (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete cascade,
  component_id uuid references machine_components(id) on delete set null,
  title text not null,
  type text,
  severity text default 'medium',
  status text not null default 'unresolved' check (status in ('resolved','unresolved')),
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete cascade,
  title text not null,
  category text,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists stocks (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete set null,
  name text not null,
  reference text,
  category text,
  quantity integer not null default 0,
  minimum_quantity integer not null default 0,
  location text,
  unit_price numeric,
  supplier text,
  status text generated always as (
    case
      when quantity <= 0 then 'out'
      when quantity <= minimum_quantity then 'critical'
      else 'normal'
    end
  ) stored,
  created_at timestamptz not null default now()
);

alter table stocks add column if not exists reference text;
alter table stocks add column if not exists location text;
alter table stocks add column if not exists unit_price numeric;
alter table stocks add column if not exists supplier text;

alter table failures add column if not exists resolution_method text;

create table if not exists amdec_entries (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete cascade,
  component_id uuid references machine_components(id) on delete set null,
  element_name text not null,
  failure_mode text,
  causes text,
  effects text,
  frequency integer not null default 1 check (frequency between 1 and 5),
  gravity integer not null default 1 check (gravity between 1 and 5),
  detection integer not null default 1 check (detection between 1 and 5),
  criticality integer generated always as (frequency * gravity * detection) stored,
  intervention_type text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table usines enable row level security;
alter table chaines enable row level security;
alter table machines enable row level security;
alter table chaine_members enable row level security;
alter table machine_components enable row level security;
alter table interventions enable row level security;
alter table failures enable row level security;
alter table documents enable row level security;
alter table stocks enable row level security;
alter table amdec_entries enable row level security;

drop policy if exists "authenticated read profiles" on profiles;
drop policy if exists "users update own profile" on profiles;
drop policy if exists "authenticated all usines" on usines;
drop policy if exists "authenticated all chaines" on chaines;
drop policy if exists "authenticated all machines" on machines;
drop policy if exists "authenticated all chaine_members" on chaine_members;
drop policy if exists "authenticated all components" on machine_components;
drop policy if exists "authenticated all interventions" on interventions;
drop policy if exists "authenticated all failures" on failures;
drop policy if exists "authenticated all documents" on documents;
drop policy if exists "authenticated all stocks" on stocks;
drop policy if exists "authenticated all amdec" on amdec_entries;

create policy "authenticated read profiles" on profiles for select to authenticated using (true);
create policy "users update own profile" on profiles for update to authenticated using (auth.uid() = id);
create policy "authenticated all usines" on usines for all to authenticated using (true) with check (true);
create policy "authenticated all chaines" on chaines for all to authenticated using (true) with check (true);
create policy "authenticated all machines" on machines for all to authenticated using (true) with check (true);
create policy "authenticated all chaine_members" on chaine_members for all to authenticated using (true) with check (true);
create policy "authenticated all components" on machine_components for all to authenticated using (true) with check (true);
create policy "authenticated all interventions" on interventions for all to authenticated using (true) with check (true);
create policy "authenticated all failures" on failures for all to authenticated using (true) with check (true);
create policy "authenticated all documents" on documents for all to authenticated using (true) with check (true);
create policy "authenticated all stocks" on stocks for all to authenticated using (true) with check (true);
create policy "authenticated all amdec" on amdec_entries for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values
  ('images', 'images', true),
  ('documents', 'documents', true),
  ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "authenticated upload images" on storage.objects;
drop policy if exists "public read imms storage" on storage.objects;
drop policy if exists "authenticated update imms storage" on storage.objects;
drop policy if exists "authenticated delete imms storage" on storage.objects;

create policy "authenticated upload images" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('images','documents','avatars'));

create policy "public read imms storage" on storage.objects
  for select to public
  using (bucket_id in ('images','documents','avatars'));

create policy "authenticated update imms storage" on storage.objects
  for update to authenticated
  using (bucket_id in ('images','documents','avatars'))
  with check (bucket_id in ('images','documents','avatars'));

create policy "authenticated delete imms storage" on storage.objects
  for delete to authenticated
  using (bucket_id in ('images','documents','avatars'));
