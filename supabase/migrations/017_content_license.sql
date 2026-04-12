-- Migration 017: Creator Content License tracking
-- Records when an artist accepted the WANKONG Creator Content License Agreement
-- and which version they accepted. Required before distribution is processed.

-- ── 1. distribution_releases — store acceptance at submission time ─────────────
alter table distribution_releases
  add column if not exists content_license_accepted_at  timestamptz,
  add column if not exists content_license_version      text default '1.0';

-- ── 2. tracks — also record acceptance for direct (non-distribution) uploads ───
alter table tracks
  add column if not exists content_license_accepted_at  timestamptz,
  add column if not exists content_license_version      text default '1.0';

-- ── 3. Index for compliance audits ────────────────────────────────────────────
create index if not exists idx_distribution_releases_license
  on distribution_releases (content_license_accepted_at)
  where content_license_accepted_at is not null;

create index if not exists idx_tracks_license
  on tracks (content_license_accepted_at)
  where content_license_accepted_at is not null;
