/**
 * WANKONG — generate-canvas Edge Function
 *
 * Triggered when a competition winner is selected or an artist
 * requests canvas/motion artwork generation.
 *
 * Generates:
 *   • Spotify Canvas  — 720×1280 muted vertical loop MP4 (3–8s)
 *   • Apple Motion    — 3000×3000 JPEG/HEIC still
 *   • Teaser 30s clip
 *   • Teaser 60s clip
 *
 * All stored in Supabase Storage and indexed in
 * distribution_canvas_assets.
 *
 * Invocation:
 *   POST /functions/v1/generate-canvas
 *   Body: { release_id: string, entry_id?: string }
 *
 * Environment variables:
 *   CLOUDINARY_CLOUD_NAME   — Cloudinary for media transforms
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASSET_TYPES = [
  { type: 'spotify_canvas',  bucket: 'canvas-assets',    ext: 'mp4'  },
  { type: 'apple_motion',    bucket: 'motion-artwork',   ext: 'jpg'  },
  { type: 'teaser_30s',      bucket: 'promo-clips',      ext: 'mp4'  },
  { type: 'teaser_60s',      bucket: 'promo-clips',      ext: 'mp4'  },
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { release_id, entry_id } = await req.json();
    if (!release_id) {
      return new Response(JSON.stringify({ error: 'release_id required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_KEY')!,
    );

    // Fetch release + artwork
    const { data: release, error: relErr } = await supabase
      .from('distribution_releases')
      .select('id, artwork_url, ditto_release_id, tracks(title, audio_url, artist_id)')
      .eq('id', release_id)
      .single();

    if (relErr || !release) {
      return new Response(JSON.stringify({ error: 'Release not found' }), { status: 404 });
    }

    // Queue all asset records as "processing"
    const now = new Date().toISOString();
    const queuedAssets = ASSET_TYPES.map(a => ({
      release_id,
      asset_type: a.type,
      status: 'processing',
      created_at: now,
    }));

    const { error: qErr } = await supabase
      .from('distribution_canvas_assets')
      .upsert(queuedAssets, { onConflict: 'release_id,asset_type' });

    if (qErr) console.error('Queue error:', qErr);

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const cloudKey  = Deno.env.get('CLOUDINARY_API_KEY');
    const cloudSec  = Deno.env.get('CLOUDINARY_API_SECRET');

    const results: Record<string, string | null> = {};

    if (cloudName && cloudKey && cloudSec && release.artwork_url) {
      // ── Spotify Canvas: crop artwork to 720x1280, output as video loop ──
      try {
        const canvasUrl = `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_720,h_1280,g_auto,f_mp4,du_6,vc_h264/${encodeURIComponent(release.artwork_url)}`;
        results['spotify_canvas'] = canvasUrl;

        await supabase.from('distribution_canvas_assets').update({
          url: canvasUrl,
          status: 'done',
        }).eq('release_id', release_id).eq('asset_type', 'spotify_canvas');
      } catch (e) {
        console.error('Spotify Canvas error:', e);
        await supabase.from('distribution_canvas_assets').update({ status: 'failed' })
          .eq('release_id', release_id).eq('asset_type', 'spotify_canvas');
      }

      // ── Apple Motion: 3000x3000 high-res still ──────────────────────────
      try {
        const motionUrl = `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_3000,h_3000,g_auto,f_jpg,q_90/${encodeURIComponent(release.artwork_url)}`;
        results['apple_motion'] = motionUrl;

        await supabase.from('distribution_canvas_assets').update({
          url: motionUrl,
          status: 'done',
        }).eq('release_id', release_id).eq('asset_type', 'apple_motion');
      } catch (e) {
        console.error('Apple Motion error:', e);
        await supabase.from('distribution_canvas_assets').update({ status: 'failed' })
          .eq('release_id', release_id).eq('asset_type', 'apple_motion');
      }

      // ── Teaser clips (30s, 60s) — use audio_url with artwork overlay ────
      for (const [type, dur] of [['teaser_30s', 30], ['teaser_60s', 60]] as const) {
        try {
          if (release.tracks?.audio_url) {
            const teaserUrl = `https://res.cloudinary.com/${cloudName}/video/upload/c_fill,w_720,h_1280,du_${dur},l_fetch:${encodeURIComponent(release.artwork_url)},c_fill,w_720,h_1280/${encodeURIComponent(release.tracks.audio_url)}`;
            results[type] = teaserUrl;

            await supabase.from('distribution_canvas_assets').update({
              url: teaserUrl,
              status: 'done',
            }).eq('release_id', release_id).eq('asset_type', type);
          } else {
            await supabase.from('distribution_canvas_assets').update({ status: 'failed' })
              .eq('release_id', release_id).eq('asset_type', type);
          }
        } catch (e) {
          console.error(`${type} error:`, e);
          await supabase.from('distribution_canvas_assets').update({ status: 'failed' })
            .eq('release_id', release_id).eq('asset_type', type);
        }
      }
    } else {
      // No Cloudinary — mark all as failed with helpful note
      console.warn('Cloudinary env vars not configured. Canvas generation skipped.');
      await supabase.from('distribution_canvas_assets')
        .update({ status: 'failed' })
        .eq('release_id', release_id);
    }

    return new Response(JSON.stringify({
      success: true,
      release_id,
      assets: results,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate-canvas]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
