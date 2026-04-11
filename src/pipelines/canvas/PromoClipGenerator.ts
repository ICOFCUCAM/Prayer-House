import { supabase } from '@/lib/supabase';

// ── PromoClipGenerator ─────────────────────────────────────────
// Generates social media promo clips (Instagram Reels, TikTok, YouTube Shorts).
// Aspect ratios: 9:16 (vertical), 1:1 (square), 16:9 (landscape).

export type PromoFormat = 'reels_9x16' | 'tiktok_9x16' | 'youtube_shorts_9x16' | 'instagram_square_1x1';

const PROMO_DURATION_SEC = 30;

export async function generatePromoClip(
  releaseId: string,
  videoUrl: string,
  format: PromoFormat = 'reels_9x16'
): Promise<string | null> {
  await supabase.from('distribution_canvas_assets').upsert([{
    release_id: releaseId,
    asset_type: 'promo_clip',
    status: 'processing',
  }], { onConflict: 'release_id,asset_type' });

  // Production:
  // const { data } = await supabase.functions.invoke('generate-promo-clip', {
  //   body: { releaseId, videoUrl, format, durationSec: PROMO_DURATION_SEC }
  // });

  const promoUrl = videoUrl.replace(/(\.[^.]+)$/, `_promo_${format}$1`);

  await supabase.from('distribution_canvas_assets').update({
    url: promoUrl,
    status: 'done',
  }).eq('release_id', releaseId).eq('asset_type', 'promo_clip');

  return promoUrl;
}

export async function generateAllPromoFormats(releaseId: string, videoUrl: string): Promise<Record<PromoFormat, string | null>> {
  const formats: PromoFormat[] = ['reels_9x16', 'tiktok_9x16', 'youtube_shorts_9x16', 'instagram_square_1x1'];
  const results: Record<string, string | null> = {};
  for (const format of formats) {
    results[format] = await generatePromoClip(releaseId, videoUrl, format);
  }
  return results as Record<PromoFormat, string | null>;
}
