import { supabase } from '@/lib/supabase';

export interface DittoReleasePayload {
  trackId:      string;
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
  platforms:    string[];
}

export interface DittoResult {
  ditto_release_id: string;
  status:           string;
}

// ── submitRelease ──────────────────────────────────────────────
// In production this calls the Ditto Music API:
//   POST https://api.dittomusic.com/v1/releases
// For now it simulates the call and stores the result.
export async function submitRelease(payload: DittoReleasePayload): Promise<DittoResult> {
  // Simulate Ditto API response
  const mockDittoId = `DITTO-${Date.now()}-${payload.trackId.slice(0, 8).toUpperCase()}`;

  const { error } = await supabase
    .from('distribution_releases')
    .update({
      ditto_release_id: mockDittoId,
      status:           'submitted_to_ditto',
      approved_at:      new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    })
    .eq('track_id', payload.trackId);

  if (error) throw new Error(`Ditto submit failed: ${error.message}`);

  return { ditto_release_id: mockDittoId, status: 'submitted_to_ditto' };
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
