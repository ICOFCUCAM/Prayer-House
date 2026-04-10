-- ============================================================
-- Wankong Platform — Initial Schema Migration
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- RELEASES
-- ============================================================
create table if not exists releases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  artist        text not null,
  genre         text,
  release_date  date,
  language      text default 'en',
  label         text,
  isrc          text unique,
  upc           text,
  explicit      boolean default false,
  status        text not null default 'pending' check (status in ('pending','processing','live','rejected')),
  cover_url     text,
  audio_url     text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_releases_user_id on releases(user_id);
create index if not exists idx_releases_status  on releases(status);
create index if not exists idx_releases_isrc    on releases(isrc);

-- ============================================================
-- RELEASE TRACKS
-- ============================================================
create table if not exists release_tracks (
  id          uuid primary key default gen_random_uuid(),
  release_id  uuid not null references releases(id) on delete cascade,
  track_num   int not null default 1,
  title       text not null,
  isrc        text,
  duration_s  int,
  audio_url   text,
  created_at  timestamptz default now()
);

create index if not exists idx_release_tracks_release_id on release_tracks(release_id);

-- ============================================================
-- DISTRIBUTION JOBS
-- ============================================================
create table if not exists distribution_jobs (
  id            uuid primary key default gen_random_uuid(),
  release_id    uuid not null references releases(id) on delete cascade,
  platform      text not null,
  status        text not null default 'queued' check (status in ('queued','processing','live','failed')),
  error_msg     text,
  delivered_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_distribution_jobs_release_id on distribution_jobs(release_id);
create index if not exists idx_distribution_jobs_platform   on distribution_jobs(platform);
create index if not exists idx_distribution_jobs_status     on distribution_jobs(status);

-- ============================================================
-- TRACK ROYALTIES
-- ============================================================
create table if not exists track_royalties (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid not null references release_tracks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null,
  period      text not null,  -- e.g. '2025-03'
  streams     bigint default 0,
  amount_usd  numeric(12, 4) default 0,
  paid        boolean default false,
  paid_at     timestamptz,
  created_at  timestamptz default now()
);

create index if not exists idx_track_royalties_user_id  on track_royalties(user_id);
create index if not exists idx_track_royalties_track_id on track_royalties(track_id);
create index if not exists idx_track_royalties_period   on track_royalties(period);

-- ============================================================
-- COMPETITIONS
-- ============================================================
create table if not exists competitions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  category      text,
  prize         text,
  deadline      timestamptz not null,
  voting_start  timestamptz,
  voting_end    timestamptz,
  status        text not null default 'draft' check (status in ('draft','active','voting','ended')),
  cover_url     text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_competitions_status   on competitions(status);
create index if not exists idx_competitions_deadline on competitions(deadline);

-- ============================================================
-- COMPETITION ENTRIES
-- ============================================================
create table if not exists competition_entries (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid not null references competitions(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  description      text,
  media_url        text,
  media_type       text not null default 'audio' check (media_type in ('audio','video','podcast')),
  ai_score         numeric(5, 2),
  ai_flags         jsonb,
  admin_status     text not null default 'pending' check (admin_status in ('pending','approved','rejected')),
  admin_note       text,
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz default now(),
  unique (competition_id, user_id)
);

create index if not exists idx_competition_entries_competition_id on competition_entries(competition_id);
create index if not exists idx_competition_entries_user_id        on competition_entries(user_id);
create index if not exists idx_competition_entries_admin_status   on competition_entries(admin_status);

-- ============================================================
-- COMPETITION VOTES
-- ============================================================
create table if not exists competition_votes (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references competition_entries(id) on delete cascade,
  user_id     uuid references auth.users(id),
  session_id  text,
  ip_hash     text,
  created_at  timestamptz default now(),
  -- prevent duplicate votes by same session or logged-in user
  unique (entry_id, session_id),
  unique (entry_id, user_id)
);

create index if not exists idx_competition_votes_entry_id  on competition_votes(entry_id);
create index if not exists idx_competition_votes_user_id   on competition_votes(user_id);

-- ============================================================
-- COMPETITION LEADERBOARDS (materialized-style view helper)
-- ============================================================
create table if not exists competition_leaderboards (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  entry_id       uuid not null references competition_entries(id) on delete cascade,
  rank           int not null,
  vote_count     bigint not null default 0,
  last_updated   timestamptz default now(),
  unique (competition_id, entry_id)
);

create index if not exists idx_competition_leaderboards_competition_id on competition_leaderboards(competition_id);

-- ============================================================
-- ADMIN LOGS
-- ============================================================
create table if not exists admin_logs (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,
  entity_type  text,
  entity_id    text,
  details      jsonb,
  performed_by uuid references auth.users(id),
  created_at   timestamptz default now()
);

create index if not exists idx_admin_logs_action       on admin_logs(action);
create index if not exists idx_admin_logs_performed_by on admin_logs(performed_by);
create index if not exists idx_admin_logs_created_at   on admin_logs(created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Releases
alter table releases enable row level security;
create policy "releases_select_own"  on releases for select using (auth.uid() = user_id);
create policy "releases_insert_own"  on releases for insert with check (auth.uid() = user_id);
create policy "releases_update_own"  on releases for update using (auth.uid() = user_id);
create policy "releases_admin_all"   on releases using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Distribution Jobs (read-only for owner, full access for admin)
alter table distribution_jobs enable row level security;
create policy "distribution_jobs_select_own" on distribution_jobs for select using (
  exists (select 1 from releases r where r.id = release_id and r.user_id = auth.uid())
);
create policy "distribution_jobs_admin_all" on distribution_jobs using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Track Royalties
alter table track_royalties enable row level security;
create policy "track_royalties_select_own" on track_royalties for select using (auth.uid() = user_id);
create policy "track_royalties_admin_all"  on track_royalties using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Competitions (public read, admin write)
alter table competitions enable row level security;
create policy "competitions_select_all"  on competitions for select using (true);
create policy "competitions_admin_write" on competitions for all using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Competition Entries
alter table competition_entries enable row level security;
create policy "comp_entries_select_approved" on competition_entries for select using (admin_status = 'approved');
create policy "comp_entries_select_own"      on competition_entries for select using (auth.uid() = user_id);
create policy "comp_entries_insert_own"      on competition_entries for insert with check (auth.uid() = user_id);
create policy "comp_entries_admin_all"       on competition_entries using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Competition Votes
alter table competition_votes enable row level security;
create policy "comp_votes_select_all"   on competition_votes for select using (true);
create policy "comp_votes_insert_any"   on competition_votes for insert with check (true);

-- Leaderboards (public read)
alter table competition_leaderboards enable row level security;
create policy "leaderboards_select_all" on competition_leaderboards for select using (true);

-- Admin Logs
alter table admin_logs enable row level security;
create policy "admin_logs_insert_any" on admin_logs for insert with check (true);
create policy "admin_logs_select_admin" on admin_logs for select using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table competition_votes;
alter publication supabase_realtime add table competition_leaderboards;
alter publication supabase_realtime add table distribution_jobs;
