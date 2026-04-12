import { supabase } from '@/lib/supabase';

export interface DittoReleasePayload {
  releaseId:    string;   // distribution_releases.id
  trackId:      string;   // tracks.id (first track for albums)
  title:        string;
  artistName:   string;
  genre:        string;
  language:     string;
  releaseDate:  string;
  audioUrl:     string;
  artworkUrl:   string;
  releaseType:  'single' | 'ep' | 'album';
  copyrightOwner: string;
  composer:     string;
  producer:     string;
  labelName:    string;
  explicit:     boolean;
  isrc?:        string;
  platforms:    string[];
}

export interface DittoResult {
  ditto_release_id: string;
  status:           string;
}

// ── submitRelease ──────────────────────────────────────────────
// In production this calls the Ditto Music API:
//   POST https://api.dittomusic.com/v1/releases
//   Headers: Authorization: Bearer <DITTO_API_KEY>
//   Body: { title, artist, upc, isrc, genre, release_date, audio_url, artwork_url, ... }
//
// For now the API call is simulated — the DB record and status update
// are real so the admin panel flow works end-to-end.
export async function submitRelease(payload: DittoReleasePayload): Promise<DittoResult> {
  // ── TODO: Replace mock block with real Ditto API call ───────────���─────────
  // const response = await fetch('https://api.dittomusic.com/v1/releases', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${import.meta.env.VITE_DITTO_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     title:          payload.title,
  //     primary_artist: payload.artistName,
  //     genre:          payload.genre,
  //     language:       payload.language,
  //     release_date:   payload.releaseDate,
  //     release_type:   payload.releaseType,
  //     copyright:      payload.copyrightOwner,
  //     composer:       payload.composer,
  //     producer:       payload.producer,
  //     label:          payload.labelName,
  //     explicit:       payload.explicit,
  //     isrc:           payload.isrc,
  //     platforms:      payload.platforms,
  //     audio_url:      payload.audioUrl,
  //     artwork_url:    payload.artworkUrl,
  //   }),
  // });
  // if (!response.ok) throw new Error(`Ditto API error: ${response.status}`);
  // const dittoData = await response.json();
  // const dittoId = dittoData.release_id;
  // ── End TODO ───────────────────────────────────────────────────────────────

  const mockDittoId = `DITTO-${Date.now()}-${payload.releaseId.slice(0, 8).toUpperCase()}`;

  const { error } = await supabase
    .from('distribution_releases')
    .update({
      ditto_release_id: mockDittoId,
      status:           'submitted_to_ditto',
      updated_at:       new Date().toISOString(),
    })
    .eq('id', payload.releaseId);

  if (error) throw new Error(`Ditto submit failed: ${error.message}`);

  return { ditto_release_id: mockDittoId, status: 'submitted_to_ditto' };
}

// ── generateDittoExport ───────────────────────────────────────
// Builds the Ditto-ready export package, saves to distributor_exports,
// and transitions the release to 'sent_to_ditto'.
export interface DittoExportResult {
  exportId:     string;
  metadata:     Record<string, unknown>;
  tracklistCsv: string;
}

export async function generateDittoExport(releaseId: string): Promise<DittoExportResult> {
  // 1. Fetch release
  const { data: release, error: relErr } = await supabase
    .from('distribution_releases')
    .select('*')
    .eq('id', releaseId)
    .single();
  if (relErr || !release) throw new Error(`Release not found: ${relErr?.message ?? 'unknown'}`);

  // 2. Fetch tracks for this release (album) or the linked single track
  let trackRows: Record<string, unknown>[] = [];
  if (release.release_type !== 'single') {
    const { data: albumTracks } = await supabase
      .from('tracks')
      .select('id, title, audio_url, isrc, explicit, track_number, duration_s')
      .eq('release_id', releaseId)
      .order('track_number', { ascending: true });
    trackRows = (albumTracks ?? []) as Record<string, unknown>[];
  }
  if (trackRows.length === 0 && release.track_id) {
    const { data: singleTrack } = await supabase
      .from('tracks')
      .select('id, title, audio_url, isrc, explicit, track_number, duration_s')
      .eq('id', release.track_id)
      .single();
    if (singleTrack) trackRows = [singleTrack as Record<string, unknown>];
  }

  // 3. Build metadata payload
  const metadata: Record<string, unknown> = {
    release_id:   release.id,
    title:        release.title,
    artist:       release.artist_name,
    genre:        release.genre,
    language:     release.language_code,
    release_type: release.release_type,
    release_date: release.release_date,
    cover_url:    release.cover_url,
    copyright:    release.copyright_owner ?? `© ${new Date().getFullYear()} ${release.artist_name}`,
    composer:     release.composer ?? release.artist_name,
    producer:     release.producer ?? '',
    label:        release.label_name ?? release.artist_name,
    explicit:     release.explicit,
    isrc:         release.isrc,
    territories:  release.territories ?? [],
    platforms:    ['spotify', 'apple_music', 'tiktok', 'youtube_music', 'boomplay', 'audiomack'],
    track_count:  trackRows.length,
    exported_at:  new Date().toISOString(),
  };

  // 4. Build tracklist CSV
  const csvHeader = 'track_number,title,audio_url,isrc,explicit,duration_s';
  const csvRows = trackRows.map(t =>
    `${t.track_number ?? 1},"${String(t.title ?? '').replace(/"/g, '""')}","${t.audio_url ?? ''}","${t.isrc ?? ''}",${t.explicit ? 'true' : 'false'},${t.duration_s ?? ''}`
  );
  const tracklistCsv = [csvHeader, ...csvRows].join('\n');

  // 5. Save export record
  const { data: exportRow, error: exportErr } = await supabase
    .from('distributor_exports')
    .insert([{
      release_id:     releaseId,
      distributor:    'ditto',
      export_status:  'submitted',
      export_payload: metadata,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    }])
    .select('id')
    .single();
  if (exportErr) throw new Error(`Export record failed: ${exportErr.message}`);

  // 6. Update release status + set mock Ditto ID
  const mockDittoId = `DITTO-${Date.now()}-${releaseId.slice(0, 8).toUpperCase()}`;
  await supabase
    .from('distribution_releases')
    .update({
      status:           'sent_to_ditto',
      ditto_release_id: mockDittoId,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', releaseId);

  return { exportId: exportRow.id, metadata, tracklistCsv };
}

// ── updateReleaseStatus ────────────────────────────────────────
export async function updateReleaseStatus(
  dittoReleaseId: string,
  status: 'live' | 'rejected' | 'submitted_to_ditto',
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'live') updates.live_at = new Date().toISOString();

  const { error } = await supabase
    .from('distribution_releases')
    .update(updates)
    .eq('ditto_release_id', dittoReleaseId);

  if (error) throw new Error(`Status update failed: ${error.message}`);
}

// ── fetchRoyaltyReports ────────────────────────────────────────
export async function fetchRoyaltyReports(artistId: string, period: string) {
  const { data, error } = await supabase
    .from('artist_earnings')
    .select('*, track:tracks(title, artwork_url)')
    .eq('artist_id', artistId)
    .eq('period', period)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Royalty fetch failed: ${error.message}`);
  return data ?? [];
}

// ── autoQueueWinnerRelease ─────────────────────────────────────
export async function autoQueueWinnerRelease(
  entryId: string,
  trackId: string,
): Promise<void> {
  const { error } = await supabase.from('distribution_releases').insert([{
    track_id:         trackId,
    status:           'priority_distribution_queue',
    is_winner_release: true,
    submitted_at:     new Date().toISOString(),
  }]);

  if (error) throw new Error(`Auto-queue winner failed: ${error.message}`);

  // Update competition entry
  await supabase
    .from('competition_entries_v2')
    .update({ status: 'winner', is_winner: true, updated_at: new Date().toISOString() })
    .eq('id', entryId);
}

// ── recordStream ──────────────────────────────────────────────
export async function recordStream(
  trackId: string,
  listenerId: string | null,
  country?: string,
  device?: string,
): Promise<void> {
  await supabase.from('music_streams').insert([{
    track_id:    trackId,
    listener_id: listenerId,
    country:     country ?? 'unknown',
    device:      device ?? 'web',
  }]);

  // Update earnings (simplified — production would use a Postgres function)
  const { data: splits } = await supabase
    .from('royalty_splits')
    .select('*')
    .eq('track_id', trackId)
    .eq('role', 'artist');

  if (splits && splits.length > 0) {
    const streamValue = 0.004; // $0.004 per stream
    for (const split of splits) {
      const share = (streamValue * split.percentage) / 100;
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM

      await supabase.rpc('increment_artist_earnings', {
        p_track_id:   trackId,
        p_artist_id:  split.recipient_id,
        p_period:     period,
        p_stream_val: share,
        p_plat_val:   streamValue * 0.30,
      }).catch(() => {
        // RPC may not exist yet — insert directly
        supabase.from('artist_earnings').insert([{
          track_id:         trackId,
          artist_id:        split.recipient_id,
          period,
          streams:          1,
          artist_share:     share,
          platform_share:   streamValue * 0.30,
          platform_revenue: streamValue,
        }]);
      });
    }
  }
}
