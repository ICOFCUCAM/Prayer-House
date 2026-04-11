-- ============================================================
-- WANKONG Phase 4 — Role-Based Auth & Admin System
-- ============================================================

-- ── USER ROLES ────────────────────────────────────────────────
-- Each user gets exactly one role: fan (default), artist, author

create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references auth.users(id) on delete cascade,
  role       text not null default 'fan' check (role in ('fan','artist','author')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_roles_user_id on user_roles(user_id);
create index if not exists idx_user_roles_role    on user_roles(role);

-- RLS
alter table user_roles enable row level security;

create policy "Users can read own role"
  on user_roles for select
  using (auth.uid() = user_id);

create policy "Users can insert own role"
  on user_roles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own role"
  on user_roles for update
  using (auth.uid() = user_id);

-- ── ADMIN ROLES ───────────────────────────────────────────────
-- Separate table — only super_admin can insert here

create table if not exists admin_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in (
               'super_admin','moderator','competition_admin',
               'distribution_admin','publishing_admin',
               'finance_admin','support_admin')),
  granted_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (user_id, role)
);

create index if not exists idx_admin_roles_user_id on admin_roles(user_id);

-- RLS — only visible to admins themselves
alter table admin_roles enable row level security;

create policy "Admin can read own admin role"
  on admin_roles for select
  using (auth.uid() = user_id);

-- ── PROFILES EXTENSION ────────────────────────────────────────
-- Extend profiles table if it exists, otherwise create it

create table if not exists profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  display_name       text,
  avatar_url         text,
  bio                text,
  country            text,
  preferred_language text default 'en',
  creator_level      text default 'Bronze',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile" if not exists
  on profiles for select using (auth.uid() = id);

create policy "Users can upsert own profile" if not exists
  on profiles for all using (auth.uid() = id);

-- Add columns if they don't already exist (safe for re-runs)
do $$ begin
  begin alter table profiles add column display_name text; exception when duplicate_column then null; end;
  begin alter table profiles add column avatar_url text; exception when duplicate_column then null; end;
  begin alter table profiles add column bio text; exception when duplicate_column then null; end;
  begin alter table profiles add column country text; exception when duplicate_column then null; end;
  begin alter table profiles add column preferred_language text default 'en'; exception when duplicate_column then null; end;
  begin alter table profiles add column creator_level text default 'Bronze'; exception when duplicate_column then null; end;
end $$;

-- ── ARTIST PROFILES ───────────────────────────────────────────

create table if not exists artist_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique not null references auth.users(id) on delete cascade,
  stage_name          text,
  genre               text,
  primary_language    text default 'en',
  bio                 text,
  distribution_ready  boolean default false,
  social_links        jsonb default '{}',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_artist_profiles_user_id on artist_profiles(user_id);

alter table artist_profiles enable row level security;

create policy "Artists can read own profile"
  on artist_profiles for select
  using (auth.uid() = user_id);

create policy "Artists can upsert own profile"
  on artist_profiles for all
  using (auth.uid() = user_id);

create policy "Public artist profiles visible"
  on artist_profiles for select
  using (true);

-- ── AUTHOR PROFILES ───────────────────────────────────────────

create table if not exists author_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid unique not null references auth.users(id) on delete cascade,
  pen_name             text,
  writing_languages    text[] default '{}',
  published_books_count integer default 0,
  bio                  text,
  website              text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_author_profiles_user_id on author_profiles(user_id);

alter table author_profiles enable row level security;

create policy "Authors can read own profile"
  on author_profiles for select
  using (auth.uid() = user_id);

create policy "Authors can upsert own profile"
  on author_profiles for all
  using (auth.uid() = user_id);

create policy "Public author profiles visible"
  on author_profiles for select
  using (true);

-- ── AUTO-CREATE PROFILE ON SIGNUP ────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'en'
  )
  on conflict (id) do nothing;

  -- Default role = fan
  insert into user_roles (user_id, role)
  values (new.id, 'fan')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
