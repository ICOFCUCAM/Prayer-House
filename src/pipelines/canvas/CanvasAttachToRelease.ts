import { supabase } from '@/lib/supabase';
import { generateSpotifyCanvas } from './CanvasGenerator';
import { generateAppleMotionArtwork } from './MotionArtworkGenerator';
import { generatePromoClip } from './PromoClipGenerator';

// ── CanvasAttachToRelease ──────────────────────────────────────
// Orchestrates full canvas pipeline when a winner is detected.
// Called by AdminCompetitionPanel after selectCompetitionWinner().

export async function attachCanvasAssetsToWinnerRelease(
  releaseId: string,
  videoUrl: string,
  coverImageUrl: string
): Promise<void> {
  // Run all generators in parallel
  await Promise.all([
    generateSpotifyCanvas(releaseId, videoUrl),
    generateAppleMotionArtwork(releaseId, coverImageUrl),
    generatePromoClip(releaseId, videoUrl, 'reels_9x16'),
  ]);

  // Mark release as canvas-ready
  await supabase
    .from('distribution_releases')
    .update({ canvas_ready: true })
    .eq('id', releaseId);
}

export async function triggerCanvasPipelineOnWin(entryId: string): Promise<void> {
  // Look up the release associated with this competition entry
  const { data: entry } = await supabase
    .from('competition_entries_v2')
    .select('video_url, thumbnail_url, track_id')
    .eq('id', entryId)
    .maybeSingle();

  if (!entry?.track_id) return;

  const { data: release } = await supabase
    .from('distribution_releases')
    .select('id, artwork_url')
    .eq('track_id', entry.track_id)
    .maybeSingle();

  if (!release) return;

  await attachCanvasAssetsToWinnerRelease(
    release.id,
    entry.video_url ?? '',
    release.artwork_url ?? entry.thumbnail_url ?? ''
  );
}
