-- Migration 016: External streaming URLs + extended user role types

-- ── 1. Add external streaming platform URLs to tracks ─────────────────────────
alter table tracks
  add column if not exists spotify_url       text,
  add column if not exists apple_music_url   text,
  add column if not exists youtube_music_url text,
  add column if not exists deezer_url        text;

-- ── 2. Add same columns to ecom_products (ProductPage queries this table) ──────
alter table ecom_products
  add column if not exists spotify_url       text,
  add column if not exists apple_music_url   text,
  add column if not exists youtube_music_url text,
  add column if not exists deezer_url        text;

-- ── 3. Extend user_roles to include listener + creator roles ───────────────────
-- Drop the existing check constraint and recreate with expanded values.
-- We keep 'fan' for backward compat (existing rows); 'listener' is the new name.
alter table user_roles
  drop constraint if exists user_roles_role_check;

alter table user_roles
  add constraint user_roles_role_check
  check (role in ('fan', 'listener', 'artist', 'author', 'creator'));

-- Update SelectRolePage / onboarding enum in auth metadata: no SQL change needed
-- (handled in application code via upsert to user_roles)
