-- ── 009_playlist_system.sql ──────────────────────────────────────────────────
-- Full playlist system: playlists, tracks, followers, saved items.

-- ── playlists ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  cover_url       TEXT,
  is_public       BOOLEAN DEFAULT TRUE,
  is_editorial    BOOLEAN DEFAULT FALSE,
  editorial_type  TEXT CHECK (editorial_type IN ('trending','top_creators','winners','new_releases') OR editorial_type IS NULL),
  track_count     INTEGER DEFAULT 0,
  follower_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- Public playlists are readable by all; editorial playlists are readable by all.
CREATE POLICY "Public playlists readable by all"
  ON playlists FOR SELECT
  USING (is_public = TRUE OR auth.uid() = creator_id);

CREATE POLICY "Creator manages own playlists"
  ON playlists FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Admin editorial playlists: managed via service role in production.

-- ── playlist_tracks ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id  UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id     TEXT NOT NULL,   -- external content id (product id, track id, entry id, etc.)
  content_type TEXT NOT NULL DEFAULT 'music'
               CHECK (content_type IN ('music','video','audiobook','podcast','course','competition')),
  title        TEXT NOT NULL,
  artist       TEXT,
  cover_url    TEXT,
  audio_url    TEXT,
  video_url    TEXT,
  duration     INTEGER,
  position     INTEGER NOT NULL DEFAULT 0,
  added_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (playlist_id, track_id)
);

ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playlist tracks readable if playlist is public or owned"
  ON playlist_tracks FOR SELECT
  USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE is_public = TRUE OR creator_id = auth.uid()
    )
  );

CREATE POLICY "Playlist owner manages tracks"
  ON playlist_tracks FOR ALL
  USING (
    playlist_id IN (SELECT id FROM playlists WHERE creator_id = auth.uid())
  )
  WITH CHECK (
    playlist_id IN (SELECT id FROM playlists WHERE creator_id = auth.uid())
  );

-- ── playlist_followers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlist_followers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id  UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (playlist_id, user_id)
);

ALTER TABLE playlist_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own follows"
  ON playlist_followers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── saved_tracks ──────────────────────────────────────────────────────────────
-- Unified "liked / saved" table for all content types.
CREATE TABLE IF NOT EXISTS saved_tracks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id     TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'music'
               CHECK (content_type IN ('music','video','audiobook','podcast','course','competition')),
  title        TEXT NOT NULL,
  artist       TEXT,
  cover_url    TEXT,
  audio_url    TEXT,
  video_url    TEXT,
  duration     INTEGER,
  saved_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, track_id)
);

ALTER TABLE saved_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved tracks"
  ON saved_tracks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Triggers: keep track_count + follower_count in sync ──────────────────────

CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists SET track_count = track_count + 1, updated_at = NOW() WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists SET track_count = GREATEST(track_count - 1, 0), updated_at = NOW() WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_playlist_track_count ON playlist_tracks;
CREATE TRIGGER trg_playlist_track_count
AFTER INSERT OR DELETE ON playlist_tracks
FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

CREATE OR REPLACE FUNCTION update_playlist_follower_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists SET follower_count = follower_count + 1 WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_playlist_follower_count ON playlist_followers;
CREATE TRIGGER trg_playlist_follower_count
AFTER INSERT OR DELETE ON playlist_followers
FOR EACH ROW EXECUTE FUNCTION update_playlist_follower_count();

-- ── Seed editorial playlists (idempotent) ─────────────────────────────────────
INSERT INTO playlists (name, description, is_public, is_editorial, editorial_type)
SELECT name, description, TRUE, TRUE, editorial_type FROM (VALUES
  ('Trending This Week',    'The hottest tracks on WANKONG right now',            'trending'),
  ('Top Creators This Week','Handpicked from our most talented creators this week','top_creators'),
  ('Competition Winners',   'Award-winning performances from our competitions',    'winners'),
  ('New Releases',          'Fresh drops — just landed on WANKONG',               'new_releases')
) AS t(name, description, editorial_type)
WHERE NOT EXISTS (SELECT 1 FROM playlists WHERE is_editorial = TRUE AND editorial_type = t.editorial_type);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_playlists_creator    ON playlists(creator_id);
CREATE INDEX IF NOT EXISTS idx_playlists_editorial  ON playlists(is_editorial) WHERE is_editorial = TRUE;
CREATE INDEX IF NOT EXISTS idx_plt_tracks_playlist  ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_plt_followers_user   ON playlist_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_plt_followers_plist  ON playlist_followers(playlist_id);
CREATE INDEX IF NOT EXISTS idx_saved_tracks_user    ON saved_tracks(user_id, content_type);
