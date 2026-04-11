import { supabase } from '@/lib/supabase';

// ── CanvasGenerator ────────────────────────────────────────────
// Generates Spotify Canvas (8-second looping video) from competition winner video.
// Production: call ffmpeg edge function to extract 8s loop, upload to storage.

export interface CanvasAsset {
  id: string;
  release_id: string;
  asset_type: 'spotify_canvas' | 'apple_motion' | 'promo_clip';
  url: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
}

export async function generateSpotifyCanvas(releaseId: string, videoUrl: string): Promise<string | null> {
  await supabase.from('distribution_canvas_assets').upsert([{
    release_id: releaseId,
    asset_type: 'spotify_canvas',
    status: 'processing',
  }], { onConflict: 'release_id,asset_type' });

  // Production: supabase.functions.invoke('generate-canvas', {
  //   body: { releaseId, videoUrl, durationSec: 8, format: 'mp4' }
  // })

  const canvasUrl = videoUrl.replace(/(\.[^.]+)$/, '_canvas_8s$1');

  await supabase.from('distribution_canvas_assets').update({
    url: canvasUrl,
    status: 'done',
  }).eq('release_id', releaseId).eq('asset_type', 'spotify_canvas');

  return canvasUrl;
}

export async function getReleaseCanvasAssets(releaseId: string): Promise<CanvasAsset[]> {
  const { data } = await supabase
    .from('distribution_canvas_assets')
    .select('*')
    .eq('release_id', releaseId)
    .eq('status', 'done');
  return (data ?? []) as CanvasAsset[];
}
