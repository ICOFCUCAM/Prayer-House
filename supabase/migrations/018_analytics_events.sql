-- Migration 018: Analytics Events System
-- Unified event tracking table + RLS fixes for analytics queries

-- ── 1. analytics_events — unified event log ───────────────────────────────────
create table if not exists analytics_events (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid references auth.users(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete set null,  -- the listener/actor
  track_id     uuid references tracks(id) on delete cascade,
  event_type   text not null check (event_type in (
    'stream', 'download', 'playlist_add', 'like',
    'purchase', 'competition_vote', 'subscription',
    'tip', 'royalty', 'follow'
  )),
  platform     text default 'web',
  country      text,
  device       text,
  revenue_cents integer default 0,
  metadata     jsonb default '{}',
  created_at   timestamptz default now()
);

-- Indexes for dashboard queries
create index if not exists idx_analytics_events_artist
  on analytics_events (artist_id, created_at desc);
create index if not exists idx_analytics_events_type
  on analytics_events (artist_id, event_type, created_at desc);
create index if not exists idx_analytics_events_track
  on analytics_events (track_id, event_type);
create index if not exists idx_analytics_events_country
  on analytics_events (artist_id, country);

alter table analytics_events enable row level security;
-- Artists read their own events
create policy "analytics_events_artist_read" on analytics_events
  for select using (artist_id = auth.uid());
-- Anyone can insert an event (streams, likes, etc. fire from listeners)
create policy "analytics_events_insert_any" on analytics_events
  for insert with check (true);

-- ── 2. Fix stream_events RLS — allow artists to read events on THEIR tracks ───
-- The existing policy only lets listeners read their own events.
-- Artists need to read all events on tracks they own for analytics.
drop policy if exists "stream_events_artist_track_read" on stream_events;
create policy "stream_events_artist_track_read" on stream_events
  for select using (
    track_id in (
      select id from tracks where artist_id = auth.uid()
    )
  );

-- ── 3. Fix stream_geo RLS — ensure artists can read their own geo rows ────────
-- (Existing policy uses user_id = auth.uid() which is correct if stream_geo
--  is populated by artist user_id. No change needed, but add an explicit
--  admin read policy for completeness.)
create policy if not exists "stream_geo_admin_read" on stream_geo
  for select using (
    (select raw_user_meta_data->>'role'
     from auth.users where id = auth.uid()) = 'admin'
  );

-- ── 4. Add download_count to tracks for direct tracking ──────────────────────
alter table tracks
  add column if not exists download_count bigint default 0,
  add column if not exists like_count     bigint default 0,
  add column if not exists playlist_count bigint default 0;

-- ── 5. Ensure artist_earnings has proper artist_id index ─────────────────────
create index if not exists idx_artist_earnings_artist
  on artist_earnings (artist_id, period);
