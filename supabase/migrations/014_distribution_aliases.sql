-- Migration 014: Distribution schema aliases & export bundle column
--
-- Adds generated columns so the spec-required names work alongside
-- the existing column names without any data migration:
--   distribution_releases.artist_id   ← generated from user_id
--   distribution_releases.cover_art_url ← generated from cover_url
--   tracks.is_explicit                 ← generated from explicit
--   tracks.duration                    ← generated from duration_s
-- Also adds distributor_exports.file_bundle_url (regular column)
-- and distributor_exports.admin_id (who triggered the export).

-- ── 1. distribution_releases ─────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='artist_id') then
    alter table distribution_releases
      add column artist_id uuid generated always as (user_id) stored;
    create index if not exists idx_distribution_releases_artist_id
      on distribution_releases(artist_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distribution_releases' and column_name='cover_art_url') then
    alter table distribution_releases
      add column cover_art_url text generated always as (cover_url) stored;
  end if;
end $$;

-- ── 2. tracks ────────────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='tracks' and column_name='is_explicit') then
    alter table tracks
      add column is_explicit boolean generated always as (explicit) stored;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='tracks' and column_name='duration') then
    alter table tracks
      add column duration integer generated always as (duration_s) stored;
  end if;
end $$;

-- ── 3. distributor_exports: file_bundle_url + admin_id ───────────────────────

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distributor_exports' and column_name='file_bundle_url') then
    alter table distributor_exports add column file_bundle_url text;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_name='distributor_exports' and column_name='admin_id') then
    alter table distributor_exports
      add column admin_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- ── 4. Extend release_reviews.action CHECK to include 'forwarded_to_ditto' ───

alter table release_reviews drop constraint if exists release_reviews_action_check;
alter table release_reviews add constraint release_reviews_action_check
  check (action in (
    'submitted','under_review','changes_requested',
    'approved','rejected','sent_to_ditto','forwarded_to_ditto',
    'distributed','live'
  ));
