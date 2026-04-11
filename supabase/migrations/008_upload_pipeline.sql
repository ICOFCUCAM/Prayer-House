-- ── 008_upload_pipeline.sql ──────────────────────────────────────────────────
-- Upload pipeline tables for the WANKONG distribution system.
-- Safely adds tables / columns that may not exist yet.

-- ── releases ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS releases (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_title      TEXT NOT NULL,
  release_type       TEXT NOT NULL CHECK (release_type IN ('single','ep','album','audiobook','podcast','competition','book')),
  primary_artist     TEXT NOT NULL,
  featured_artists   TEXT,
  release_date       DATE,
  genre              TEXT,
  language           TEXT DEFAULT 'en',
  explicit           BOOLEAN DEFAULT FALSE,
  record_label       TEXT,
  copyright_owner    TEXT,
  territories        TEXT[] DEFAULT ARRAY['worldwide'],
  artwork_url        TEXT,
  description        TEXT,
  status             TEXT DEFAULT 'draft' CHECK (status IN ('draft','processing','submitted','live','rejected')),
  ditto_release_id   TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage own releases"
  ON releases FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ── tracks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id       UUID REFERENCES releases(id) ON DELETE CASCADE,
  creator_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  track_number     INTEGER DEFAULT 1,
  title            TEXT NOT NULL,
  composer         TEXT,
  producer         TEXT,
  isrc             TEXT,
  audio_url        TEXT,
  duration_seconds INTEGER,
  preview_start    INTEGER DEFAULT 0,
  explicit         BOOLEAN DEFAULT FALSE,
  status           TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage own tracks"
  ON tracks FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ── royalty_splits ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS royalty_splits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id     UUID REFERENCES releases(id) ON DELETE CASCADE,
  track_id       UUID REFERENCES tracks(id) ON DELETE CASCADE,
  role           TEXT NOT NULL,
  label          TEXT,
  percentage     NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  recipient_id   UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE royalty_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage royalty splits"
  ON royalty_splits FOR ALL
  USING (
    release_id IN (SELECT id FROM releases WHERE creator_id = auth.uid())
  );

-- ── distribution_targets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS distribution_targets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id     UUID REFERENCES releases(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,
  enabled        BOOLEAN DEFAULT TRUE,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','submitted','live','rejected','error')),
  platform_url   TEXT,
  submitted_at   TIMESTAMPTZ,
  live_at        TIMESTAMPTZ,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE distribution_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage own distribution targets"
  ON distribution_targets FOR ALL
  USING (
    release_id IN (SELECT id FROM releases WHERE creator_id = auth.uid())
  );

-- ── audiobook_chapters ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audiobook_chapters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id       UUID REFERENCES releases(id) ON DELETE CASCADE,
  chapter_number   INTEGER NOT NULL,
  title            TEXT NOT NULL,
  audio_url        TEXT,
  duration_seconds INTEGER,
  narrator         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audiobook_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage own audiobook chapters"
  ON audiobook_chapters FOR ALL
  USING (
    release_id IN (SELECT id FROM releases WHERE creator_id = auth.uid())
  );

-- ── competition_entries (idempotent extension) ────────────────────────────────
CREATE TABLE IF NOT EXISTS competition_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id      UUID REFERENCES releases(id) ON DELETE SET NULL,
  competition_id  UUID,
  video_url       TEXT,
  preview_clip_url TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  ai_score        NUMERIC(5,2),
  votes_count     INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  resolution      TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','live','winner','rejected')),
  is_winner       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage own competition entries"
  ON competition_entries FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ── books ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id            UUID REFERENCES releases(id) ON DELETE CASCADE,
  creator_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  author                TEXT NOT NULL,
  isbn                  TEXT,
  -- eBook
  ebook_source          TEXT CHECK (ebook_source IN ('wankong','amazon','external','none')) DEFAULT 'none',
  ebook_url             TEXT,
  ebook_price           NUMERIC(10,2),
  ebook_visible         BOOLEAN DEFAULT TRUE,
  -- Softcover
  softcover_source      TEXT CHECK (softcover_source IN ('wankong','amazon','external','none')) DEFAULT 'none',
  softcover_url         TEXT,
  softcover_price       NUMERIC(10,2),
  softcover_visible     BOOLEAN DEFAULT TRUE,
  -- Hardcover
  hardcover_source      TEXT CHECK (hardcover_source IN ('wankong','amazon','external','none')) DEFAULT 'none',
  hardcover_url         TEXT,
  hardcover_price       NUMERIC(10,2),
  hardcover_visible     BOOLEAN DEFAULT TRUE,
  -- Admin toggles
  admin_show_ebook      BOOLEAN DEFAULT TRUE,
  admin_show_softcover  BOOLEAN DEFAULT TRUE,
  admin_show_hardcover  BOOLEAN DEFAULT TRUE,
  -- Metadata
  synopsis              TEXT,
  categories            TEXT[],
  language              TEXT DEFAULT 'en',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can manage own books"
  ON books FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ── distribution_releases (ensure ditto_release_id column exists) ─────────────
ALTER TABLE distribution_releases
  ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES releases(id) ON DELETE SET NULL;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_releases_creator     ON releases(creator_id);
CREATE INDEX IF NOT EXISTS idx_tracks_release        ON tracks(release_id);
CREATE INDEX IF NOT EXISTS idx_splits_release        ON royalty_splits(release_id);
CREATE INDEX IF NOT EXISTS idx_dist_targets_release  ON distribution_targets(release_id);
CREATE INDEX IF NOT EXISTS idx_ab_chapters_release   ON audiobook_chapters(release_id);
CREATE INDEX IF NOT EXISTS idx_comp_entries_creator  ON competition_entries(creator_id);
CREATE INDEX IF NOT EXISTS idx_books_release         ON books(release_id);
