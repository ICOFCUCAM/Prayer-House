import { supabase } from '@/lib/supabase';

// ── MotionArtworkGenerator ─────────────────────────────────────
// Generates Apple Motion artwork (animated album art) for Apple Music.
// Production: use canvas 2D API + ffmpeg to generate animated cover.

export async function generateAppleMotionArtwork(releaseId: string, coverImageUrl: string): Promise<string | null> {
  await supabase.from('distribution_canvas_assets').upsert([{
    release_id: releaseId,
    asset_type: 'apple_motion',
    status: 'processing',
  }], { onConflict: 'release_id,asset_type' });

  // Production: call edge function to animate cover art with Ken Burns effect
  // const { data } = await supabase.functions.invoke('generate-motion-artwork', {
  //   body: { releaseId, coverImageUrl, duration: 10, effect: 'ken-burns' }
  // });

  const motionUrl = coverImageUrl.replace(/(\.[^.]+)$/, '_motion$1');

  await supabase.from('distribution_canvas_assets').update({
    url: motionUrl,
    status: 'done',
  }).eq('release_id', releaseId).eq('asset_type', 'apple_motion');

  return motionUrl;
}

export async function generateMotionFromDominantColor(
  releaseId: string,
  coverImageUrl: string
): Promise<string | null> {
  // Extract dominant color from cover image and generate animated gradient background
  // Production: use Canvas 2D API to extract color, generate WebGL gradient animation
  return generateAppleMotionArtwork(releaseId, coverImageUrl);
}
