-- Migration 015: Mobile Launch Control Center
-- Creates all tables for the mobile app launch pipeline

-- ── 1. mobile_waitlist ───────────────────────────────────────────────────────
create table if not exists mobile_waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  device_type text default 'unknown',
  country     text,
  country_code text,
  source      text default 'hero',
  created_at  timestamptz default now()
);
-- Allow upsert on email (update device/country if re-signing up)
create unique index if not exists idx_mobile_waitlist_email on mobile_waitlist(email);
create index if not exists idx_mobile_waitlist_created on mobile_waitlist(created_at desc);

alter table mobile_waitlist enable row level security;
-- Anyone can sign up
create policy "mobile_waitlist_insert_public" on mobile_waitlist
  for insert with check (true);
-- Admins can read all
create policy "mobile_waitlist_admin_select" on mobile_waitlist
  for select using (
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

-- ── 2. mobile_beta_testers ───────────────────────────────────────────────────
create table if not exists mobile_beta_testers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,
  device_type  text,
  platform     text,
  country      text,
  country_code text,
  approved     boolean default false,
  approved_by  uuid references auth.users(id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz default now()
);
create unique index if not exists idx_mobile_beta_email on mobile_beta_testers(email);
create index if not exists idx_mobile_beta_approved on mobile_beta_testers(approved);

alter table mobile_beta_testers enable row level security;
create policy "mobile_beta_insert_public"   on mobile_beta_testers for insert with check (true);
create policy "mobile_beta_select_own"      on mobile_beta_testers for select using (
  email = (select email from auth.users where id = auth.uid())
);
create policy "mobile_beta_admin_all"       on mobile_beta_testers using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ── 3. mobile_release_config (single-row settings table) ────────────────────
create table if not exists mobile_release_config (
  id                     uuid primary key default gen_random_uuid(),
  release_status         text not null default 'coming_soon',
  app_store_url          text,
  play_store_url         text,
  notifications_enabled  boolean default false,
  readiness_score        int default 72 check (readiness_score >= 0 and readiness_score <= 100),
  feature_flags          jsonb default '{
    "music_streaming":  "ready",
    "offline_playback": "testing",
    "talent_arena":     "in_progress",
    "mobile_upload":    "ready",
    "earnings":         "testing",
    "push_notifications": "in_progress",
    "language_discovery": "ready",
    "competition":      "in_progress",
    "wallet":           "in_progress"
  }'::jsonb,
  updated_at             timestamptz default now(),
  created_at             timestamptz default now()
);

-- Seed the single config row
insert into mobile_release_config (release_status, readiness_score)
select 'coming_soon', 72
where not exists (select 1 from mobile_release_config);

alter table mobile_release_config enable row level security;
-- Public can read config (needed for store URLs + notification status on the page)
create policy "mobile_config_public_select" on mobile_release_config for select using (true);
create policy "mobile_config_admin_update"  on mobile_release_config for update using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ── 4. mobile_release_regions ────────────────────────────────────────────────
create table if not exists mobile_release_regions (
  id             uuid primary key default gen_random_uuid(),
  country        text not null,
  country_code   text not null,
  priority_level int default 2 check (priority_level between 1 and 3),
  release_phase  int default 2 check (release_phase between 1 and 3),
  active         boolean default true,
  created_at     timestamptz default now()
);
create unique index if not exists idx_mobile_regions_code on mobile_release_regions(country_code);

-- Seed initial regions
insert into mobile_release_regions (country, country_code, priority_level, release_phase) values
  ('Norway',         'NO', 1, 1),
  ('Sweden',         'SE', 1, 1),
  ('Denmark',        'DK', 1, 1),
  ('United States',  'US', 1, 1),
  ('United Kingdom', 'GB', 1, 1),
  ('Canada',         'CA', 1, 1),
  ('Nigeria',        'NG', 1, 2),
  ('Cameroon',       'CM', 1, 2),
  ('Ghana',          'GH', 2, 2),
  ('Kenya',          'KE', 2, 2),
  ('South Africa',   'ZA', 2, 2),
  ('France',         'FR', 2, 2),
  ('Germany',        'DE', 2, 2),
  ('Netherlands',    'NL', 2, 2),
  ('Australia',      'AU', 2, 3),
  ('Brazil',         'BR', 3, 3),
  ('India',          'IN', 3, 3)
on conflict (country_code) do nothing;

alter table mobile_release_regions enable row level security;
create policy "mobile_regions_public_select" on mobile_release_regions for select using (true);
create policy "mobile_regions_admin_all"     on mobile_release_regions using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);
