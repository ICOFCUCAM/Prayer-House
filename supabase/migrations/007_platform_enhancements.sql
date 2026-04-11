-- ============================================================
-- WANKONG — Platform Enhancement Migration
-- Adds missing columns to existing tables and new album support
-- All statements use IF NOT EXISTS / safe ALTER patterns
-- ============================================================

-- ── Artists: add profile enhancement columns ─────────────────
alter table artists
  add column if not exists country          text,
  add column if not exists primary_language text,
  add column if not exists genre            text,
  add column if not exists banner_url       text,
  add column if not exists total_streams    bigint default 0,
  add column if not exists ranking_score    numeric(10,4) default 0;

-- ── competition_subtitles: add display metadata ───────────────
alter table competition_subtitles
  add column if not exists language_name text,
  add column if not exists flag          text;

-- ── competition_transcripts: add language display name ────────
alter table competition_transcripts
  add column if not exists language_name text;

-- ── competition_clips: social sharing metrics ─────────────────
alter table competition_clips
  add column if not exists social_shares  bigint default 0,
  add column if not exists platform       text
    check (platform in ('youtube_shorts','tiktok','instagram_reels','all'));

-- ── creator_earnings: add course_sale source type ─────────────
-- (Must recreate the check constraint to extend the allowed values)
-- We do this by dropping and re-adding the constraint safely
do $$
begin
  -- Drop old check constraint if it exists
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'creator_earnings'
      and constraint_type = 'CHECK'
      and constraint_name like '%category%'
  ) then
    alter table creator_earnings drop constraint if exists creator_earnings_category_check;
  end if;

  -- Add updated constraint that includes course_sale
  alter table creator_earnings
    add constraint creator_earnings_category_check
    check (category in (
      'music_stream','book_sale','audiobook_play',
      'competition_win','fan_vote_reward',
      'distribution_royalty','translation_sale','course_sale'
    ));
exception when others then
  null; -- swallow if constraint already extended
end;
$$;

-- ── tracks: album support ─────────────────────────────────────
alter table tracks
  add column if not exists album_id      uuid,
  add column if not exists track_number  int default 1,
  add column if not exists release_type  text default 'single'
    check (release_type in ('single','ep','album'));

-- ── albums table ──────────────────────────────────────────────
create table if not exists albums (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  description     text,
  genre           text,
  language        text default 'en',
  explicit        boolean default false,
  artwork_url     text,
  release_date    date,
  total_tracks    int default 0,
  status          text not null default 'draft'
                  check (status in ('draft','pending_review','approved','rejected','live')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_albums_artist_id on albums(artist_id);
create index if not exists idx_albums_status    on albums(status);

alter table tracks
  add constraint fk_tracks_album
    foreign key (album_id) references albums(id) on delete set null
    not valid;

-- ── albums RLS ───────────────────────────────────────────────
alter table albums enable row level security;

create policy "albums_select_live"  on albums for select using (status = 'live');
create policy "albums_own"          on albums for all using (auth.uid() = artist_id);
create policy "albums_admin"        on albums using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ── music_languages lookup table ─────────────────────────────
-- Maps language codes to display metadata for the Language Grid
create table if not exists music_languages (
  code        text primary key,
  name        text not null,
  flag        text not null,
  track_count bigint default 0,
  sort_order  int default 99
);

insert into music_languages (code, name, flag, track_count, sort_order) values
  ('en',  'English',    '🇬🇧', 0, 1),
  ('fr',  'French',     '🇫🇷', 0, 2),
  ('es',  'Spanish',    '🇪🇸', 0, 3),
  ('ar',  'Arabic',     '🇸🇦', 0, 4),
  ('pcm', 'Pidgin',     '🇳🇬', 0, 5),
  ('yo',  'Yoruba',     '🌍', 0, 6),
  ('sw',  'Swahili',    '🇰🇪', 0, 7),
  ('de',  'German',     '🇩🇪', 0, 8),
  ('pt',  'Portuguese', '🇧🇷', 0, 9),
  ('zh',  'Chinese',    '🇨🇳', 0, 10),
  ('ja',  'Japanese',   '🇯🇵', 0, 11),
  ('no',  'Norwegian',  '🇳🇴', 0, 12),
  ('zu',  'Zulu',       '🇿🇦', 0, 13),
  ('bax', 'Bamumbu',    '🇨🇲', 0, 14),
  ('lug', 'Luganda',    '🇺🇬', 0, 15),
  ('ru',  'Russian',    '🇷🇺', 0, 16),
  ('sv',  'Swedish',    '🇸🇪', 0, 17),
  ('ni',  'Nigerian',   '🇳🇬', 0, 18)
on conflict (code) do nothing;

-- ── Realtime ──────────────────────────────────────────────────
alter publication supabase_realtime add table albums;
alter publication supabase_realtime add table music_languages;

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_tracks_album_id     on tracks(album_id) where album_id is not null;
create index if not exists idx_tracks_release_type on tracks(release_type);
create index if not exists idx_comp_subtitles_lang on competition_subtitles(language);
