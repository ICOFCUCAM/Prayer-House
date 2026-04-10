-- ============================================================
-- WANKONG — Distribution & Competition Pipeline Schema
-- ============================================================

-- ── TRACKS ───────────────────────────────────────────────────
create table if not exists tracks (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  genre        text,
  language     text default 'en',
  explicit     boolean default false,
  audio_url    text,
  artwork_url  text,
  duration_s   int,
  status       text not null default 'draft'
               check (status in ('draft','pending_review','approved','rejected','live')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_tracks_artist_id on tracks(artist_id);
create index if not exists idx_tracks_status    on tracks(status);

-- ── RELEASE METADATA ─────────────────────────────────────────
create table if not exists release_metadata (
  id              uuid primary key default gen_random_uuid(),
  track_id        uuid not null references tracks(id) on delete cascade,
  release_type    text not null default 'single'
                  check (release_type in ('single','ep','album')),
  release_date    date,
  copyright_owner text,
  composer        text,
  producer        text,
  label_name      text default 'WANKONG Records',
  created_at      timestamptz default now()
);
create index if not exists idx_release_metadata_track_id on release_metadata(track_id);

-- ── DISTRIBUTION TARGETS ──────────────────────────────────────
create table if not exists distribution_targets (
  id            uuid primary key default gen_random_uuid(),
  track_id      uuid not null references tracks(id) on delete cascade,
  spotify       boolean default true,
  apple_music   boolean default true,
  tiktok        boolean default true,
  youtube_music boolean default true,
  boomplay      boolean default true,
  audiomack     boolean default true,
  instagram     boolean default true,
  facebook      boolean default true,
  amazon        boolean default true,
  deezer        boolean default true,
  all_platforms boolean default true,
  created_at    timestamptz default now()
);
create index if not exists idx_distribution_targets_track_id on distribution_targets(track_id);

-- ── ROYALTY SPLITS ────────────────────────────────────────────
create table if not exists royalty_splits (
  id           uuid primary key default gen_random_uuid(),
  track_id     uuid not null references tracks(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete set null,
  role         text not null
               check (role in ('artist','platform','producer','songwriter','choir','featured_artist')),
  percentage   numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  label        text,
  created_at   timestamptz default now()
);
create index if not exists idx_royalty_splits_track_id on royalty_splits(track_id);

-- ── DISTRIBUTION RELEASES ─────────────────────────────────────
create table if not exists distribution_releases (
  id                uuid primary key default gen_random_uuid(),
  track_id          uuid not null references tracks(id) on delete cascade,
  ditto_release_id  text,
  status            text not null default 'pending_admin_review'
                    check (status in (
                      'pending_admin_review','approved_for_distribution',
                      'submitted_to_ditto','live','rejected',
                      'priority_distribution_queue'
                    )),
  admin_note        text,
  reviewed_by       uuid references auth.users(id),
  submitted_at      timestamptz default now(),
  approved_at       timestamptz,
  live_at           timestamptz,
  is_winner_release boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists idx_distribution_releases_track_id on distribution_releases(track_id);
create index if not exists idx_distribution_releases_status   on distribution_releases(status);

-- ── MUSIC STREAMS ─────────────────────────────────────────────
create table if not exists music_streams (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid not null references tracks(id) on delete cascade,
  listener_id uuid references auth.users(id) on delete set null,
  country     text,
  device      text,
  created_at  timestamptz default now()
);
create index if not exists idx_music_streams_track_id   on music_streams(track_id);
create index if not exists idx_music_streams_created_at on music_streams(created_at desc);

-- ── ARTIST EARNINGS ───────────────────────────────────────────
create table if not exists artist_earnings (
  id               uuid primary key default gen_random_uuid(),
  track_id         uuid not null references tracks(id) on delete cascade,
  artist_id        uuid not null references auth.users(id) on delete cascade,
  period           text not null,
  streams          bigint default 0,
  downloads        bigint default 0,
  platform_revenue numeric(12,4) default 0,
  artist_share     numeric(12,4) default 0,
  platform_share   numeric(12,4) default 0,
  paid             boolean default false,
  paid_at          timestamptz,
  created_at       timestamptz default now()
);
create index if not exists idx_artist_earnings_artist_id on artist_earnings(artist_id);
create index if not exists idx_artist_earnings_track_id  on artist_earnings(track_id);
create index if not exists idx_artist_earnings_period    on artist_earnings(period);

-- ── COMPETITION ROOMS ─────────────────────────────────────────
create table if not exists competition_rooms (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,
  description text,
  prize_pool  text,
  start_date  timestamptz,
  end_date    timestamptz,
  status      text not null default 'draft'
              check (status in ('draft','open','closed','judging','completed')),
  cover_url   text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_competition_rooms_status on competition_rooms(status);

-- ── COMPETITION ENTRIES (extended) ───────────────────────────
-- Drop old table and recreate with full schema if needed
-- Using alter table to add missing columns gracefully
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_name = 'competition_entries_v2'
  ) then
    create table competition_entries_v2 (
      id                uuid primary key default gen_random_uuid(),
      room_id           uuid references competition_rooms(id) on delete cascade,
      user_id           uuid not null references auth.users(id) on delete cascade,
      title             text not null,
      category          text,
      language          text default 'en',
      performer_name    text,
      song_title        text,
      is_original       boolean default false,
      source_type       text default 'independent'
                        check (source_type in ('church','school','independent')),
      video_url         text,
      preview_clip_url  text,
      thumbnail_url     text,
      duration_seconds  int,
      resolution        text,
      audio_bitrate     int,
      ai_score          numeric(5,2),
      votes_count       bigint default 0,
      status            text not null default 'pending_review'
                        check (status in (
                          'pending_review','approved','live','rejected','winner'
                        )),
      is_winner         boolean default false,
      admin_note        text,
      reviewed_by       uuid references auth.users(id),
      reviewed_at       timestamptz,
      created_at        timestamptz default now(),
      updated_at        timestamptz default now()
    );
    create index idx_comp_entries_v2_room_id on competition_entries_v2(room_id);
    create index idx_comp_entries_v2_user_id on competition_entries_v2(user_id);
    create index idx_comp_entries_v2_status  on competition_entries_v2(status);
  end if;
end $$;

-- ── COMPETITION SCORES ────────────────────────────────────────
create table if not exists competition_scores (
  id                  uuid primary key default gen_random_uuid(),
  entry_id            uuid not null,
  pitch_score         numeric(4,2) default 0,
  timing_score        numeric(4,2) default 0,
  clarity_score       numeric(4,2) default 0,
  energy_score        numeric(4,2) default 0,
  presentation_score  numeric(4,2) default 0,
  total_score         numeric(5,2) default 0,
  created_at          timestamptz default now()
);
create index if not exists idx_competition_scores_entry_id on competition_scores(entry_id);

-- ── COMPETITION PRIZES ────────────────────────────────────────
create table if not exists competition_prizes (
  id             uuid primary key default gen_random_uuid(),
  entry_id       uuid not null,
  prize_amount   numeric(12,2) default 0,
  currency       text default 'USD',
  payment_status text not null default 'pending'
                 check (payment_status in ('pending','approved','paid')),
  paid_at        timestamptz,
  created_at     timestamptz default now()
);
create index if not exists idx_competition_prizes_entry_id on competition_prizes(entry_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table tracks enable row level security;
create policy "tracks_select_own"  on tracks for select using (auth.uid() = artist_id);
create policy "tracks_insert_own"  on tracks for insert with check (auth.uid() = artist_id);
create policy "tracks_update_own"  on tracks for update using (auth.uid() = artist_id);
create policy "tracks_admin_all"   on tracks using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

alter table distribution_releases enable row level security;
create policy "dist_releases_select_own" on distribution_releases for select using (
  exists (select 1 from tracks t where t.id = track_id and t.artist_id = auth.uid())
);
create policy "dist_releases_admin_all" on distribution_releases using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

alter table royalty_splits enable row level security;
create policy "royalty_splits_select_own" on royalty_splits for select using (
  exists (select 1 from tracks t where t.id = track_id and t.artist_id = auth.uid())
);
create policy "royalty_splits_insert_own" on royalty_splits for insert with check (
  exists (select 1 from tracks t where t.id = track_id and t.artist_id = auth.uid())
);
create policy "royalty_splits_admin_all" on royalty_splits using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

alter table artist_earnings enable row level security;
create policy "earnings_select_own" on artist_earnings for select using (auth.uid() = artist_id);
create policy "earnings_admin_all"  on artist_earnings using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

alter table competition_rooms enable row level security;
create policy "rooms_select_all"  on competition_rooms for select using (true);
create policy "rooms_admin_write" on competition_rooms for all using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

alter table competition_entries_v2 enable row level security;
create policy "entries_v2_select_live"  on competition_entries_v2 for select using (status = 'live' or status = 'winner');
create policy "entries_v2_select_own"   on competition_entries_v2 for select using (auth.uid() = user_id);
create policy "entries_v2_insert_own"   on competition_entries_v2 for insert with check (auth.uid() = user_id);
create policy "entries_v2_admin_all"    on competition_entries_v2 using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

alter table competition_prizes enable row level security;
create policy "prizes_select_admin" on competition_prizes for select using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);
create policy "prizes_admin_all" on competition_prizes using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ── REALTIME ─────────────────────────────────────────────────
alter publication supabase_realtime add table distribution_releases;
alter publication supabase_realtime add table competition_entries_v2;
alter publication supabase_realtime add table music_streams;
alter publication supabase_realtime add table artist_earnings;
