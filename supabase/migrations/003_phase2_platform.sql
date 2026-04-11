-- ============================================================
-- WANKONG Phase 2 — Extended Creator Economy Schema
-- Safe: all tables wrapped in CREATE TABLE IF NOT EXISTS
-- ============================================================

-- ── ARTISTS ──────────────────────────────────────────────────
create table if not exists artists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete cascade,
  slug         text unique not null,
  name         text not null,
  bio          text,
  photo_url    text,
  verified     boolean default false,
  streams      bigint default 0,
  votes        bigint default 0,
  followers    bigint default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_artists_slug    on artists(slug);
create index if not exists idx_artists_user_id on artists(user_id);

-- ── ARTIST FOLLOWERS ─────────────────────────────────────────
create table if not exists artist_followers (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid not null references artists(id) on delete cascade,
  follower_id  uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (artist_id, follower_id)
);
create index if not exists idx_artist_followers_artist_id   on artist_followers(artist_id);
create index if not exists idx_artist_followers_follower_id on artist_followers(follower_id);

-- ── AUTHORS ───────────────────────────────────────────────────
create table if not exists authors (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users(id) on delete cascade,
  slug            text unique,
  name            text not null,
  bio             text,
  photo_url       text,
  website         text,
  total_downloads bigint default 0,
  total_earnings  numeric(14,4) default 0,
  auto_translate  boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_authors_user_id on authors(user_id);

-- ── AUDIOBOOKS ────────────────────────────────────────────────
create table if not exists audiobooks (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid references ecom_products(id) on delete cascade,
  author_id      uuid references auth.users(id) on delete cascade,
  title          text not null,
  narrator       text,
  language       text default 'en',
  cover_url      text,
  ebook_price    numeric(10,2) default 0,
  audio_price    numeric(10,2) default 0,
  bundle_price   numeric(10,2) default 0,
  duration_s     int,
  status         text default 'draft' check (status in ('draft','processing','live','rejected')),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists idx_audiobooks_author_id on audiobooks(author_id);

-- ── AUDIOBOOK CHAPTERS ────────────────────────────────────────
create table if not exists audiobook_chapters (
  id           uuid primary key default gen_random_uuid(),
  audiobook_id uuid not null references audiobooks(id) on delete cascade,
  chapter_num  int not null default 1,
  title        text not null,
  audio_url    text,
  duration_s   int,
  created_at   timestamptz default now()
);
create index if not exists idx_audiobook_chapters_book_id on audiobook_chapters(audiobook_id);

-- ── BOOK TRANSLATIONS ─────────────────────────────────────────
create table if not exists book_translations (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid references ecom_products(id) on delete cascade,
  language    text not null,
  title       text,
  pdf_url     text,
  status      text default 'queued' check (status in ('queued','processing','done','failed')),
  created_at  timestamptz default now()
);
create index if not exists idx_book_translations_book_id  on book_translations(book_id);
create index if not exists idx_book_translations_language on book_translations(language);

-- ── COMPETITION TRANSCRIPTS ───────────────────────────────────
create table if not exists competition_transcripts (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null,
  language     text not null default 'en',
  transcript   text,
  status       text default 'queued' check (status in ('queued','processing','done','failed')),
  created_at   timestamptz default now()
);
create index if not exists idx_comp_transcripts_entry_id on competition_transcripts(entry_id);

-- ── COMPETITION SUBTITLES ─────────────────────────────────────
create table if not exists competition_subtitles (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null,
  language     text not null,
  vtt_url      text,
  status       text default 'queued' check (status in ('queued','processing','done','failed')),
  created_at   timestamptz default now()
);
create index if not exists idx_comp_subtitles_entry_id on competition_subtitles(entry_id);

-- ── COMPETITION CLIPS ─────────────────────────────────────────
create table if not exists competition_clips (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid not null,
  duration_s    int not null,
  clip_url      text,
  clip_views    bigint default 0,
  ranking_score numeric(10,4) default 0,
  status        text default 'queued' check (status in ('queued','processing','done','failed')),
  created_at    timestamptz default now()
);
create index if not exists idx_competition_clips_entry_id on competition_clips(entry_id);

-- ── DISTRIBUTION CANVAS ASSETS ────────────────────────────────
create table if not exists distribution_canvas_assets (
  id              uuid primary key default gen_random_uuid(),
  release_id      uuid references distribution_releases(id) on delete cascade,
  asset_type      text not null check (asset_type in ('spotify_canvas','apple_motion','teaser_30s','teaser_60s')),
  url             text,
  status          text default 'queued' check (status in ('queued','processing','done','failed')),
  created_at      timestamptz default now()
);
create index if not exists idx_canvas_assets_release_id on distribution_canvas_assets(release_id);

-- ── CREATOR LEVELS ────────────────────────────────────────────
create table if not exists creator_levels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique not null references auth.users(id) on delete cascade,
  level       text not null default 'Bronze'
              check (level in ('Bronze','Silver','Gold','Platinum','Diamond','Global Ambassador')),
  xp          bigint default 0,
  updated_at  timestamptz default now()
);
create index if not exists idx_creator_levels_user_id on creator_levels(user_id);

-- ── CREATOR EARNINGS ─────────────────────────────────────────
create table if not exists creator_earnings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  category         text not null
                   check (category in (
                     'music_stream','book_sale','audiobook_play',
                     'competition_win','fan_vote_reward',
                     'distribution_royalty','translation_sale'
                   )),
  amount           numeric(14,4) not null default 0,
  period           text not null,
  description      text,
  paid             boolean default false,
  created_at       timestamptz default now()
);
create index if not exists idx_creator_earnings_user_id  on creator_earnings(user_id);
create index if not exists idx_creator_earnings_period   on creator_earnings(period);
create index if not exists idx_creator_earnings_category on creator_earnings(category);

-- ── RLS ───────────────────────────────────────────────────────
alter table artists          enable row level security;
alter table artist_followers enable row level security;
alter table authors          enable row level security;
alter table audiobooks       enable row level security;
alter table audiobook_chapters enable row level security;
alter table book_translations  enable row level security;
alter table competition_transcripts enable row level security;
alter table competition_subtitles   enable row level security;
alter table competition_clips       enable row level security;
alter table distribution_canvas_assets enable row level security;
alter table creator_levels    enable row level security;
alter table creator_earnings  enable row level security;

-- Artists: public read
create policy "artists_select_all" on artists for select using (true);
create policy "artists_insert_own" on artists for insert with check (auth.uid() = user_id);
create policy "artists_update_own" on artists for update using (auth.uid() = user_id);
create policy "artists_admin"      on artists using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Followers
create policy "followers_select_all"  on artist_followers for select using (true);
create policy "followers_insert_own"  on artist_followers for insert with check (auth.uid() = follower_id);
create policy "followers_delete_own"  on artist_followers for delete using (auth.uid() = follower_id);

-- Authors
create policy "authors_select_all"  on authors for select using (true);
create policy "authors_insert_own"  on authors for insert with check (auth.uid() = user_id);
create policy "authors_update_own"  on authors for update using (auth.uid() = user_id);

-- Audiobooks: public read when live
create policy "audiobooks_select_live" on audiobooks for select using (status = 'live');
create policy "audiobooks_own"         on audiobooks for all using (auth.uid() = author_id);

-- Chapters
create policy "chapters_select_live" on audiobook_chapters for select using (
  exists (select 1 from audiobooks a where a.id = audiobook_id and a.status = 'live')
);
create policy "chapters_own" on audiobook_chapters for all using (
  exists (select 1 from audiobooks a where a.id = audiobook_id and a.author_id = auth.uid())
);

-- Creator earnings / levels: own only
create policy "earnings_select_own" on creator_earnings for select using (auth.uid() = user_id);
create policy "earnings_admin"      on creator_earnings using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);
create policy "levels_select_own"   on creator_levels for select using (auth.uid() = user_id);
create policy "levels_admin"        on creator_levels using (
  (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Realtime
alter publication supabase_realtime add table artist_followers;
alter publication supabase_realtime add table creator_levels;
alter publication supabase_realtime add table creator_earnings;
alter publication supabase_realtime add table competition_clips;
