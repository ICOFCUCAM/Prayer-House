/**
 * WANKONG — generate-clips Edge Function
 *
 * Generates short vertical social-media clips from competition
 * entries: 30s, 60s, 90s for YouTube Shorts, TikTok, Instagram Reels.
 *
 * Uses Cloudinary video transformations (crop + trim).
 * Stores results in competition-clips bucket.
 * Updates competition_clips table.
 * Recalculates entry ranking_score after clip generation.
 *
 * Ranking formula:
 *   score = votes * watch_time * subtitle_count * clip_views * social_shares
 *
 * Invocation:
 *   POST /functions/v1/generate-clips
 *   Body: { entry_id: string }
 *
 * Environment variables:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLIP_DURATIONS = [30, 60, 90];

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
    const { entry_id } = await req.json();
    if (!entry_id) {
      return new Response(JSON.stringify({ error: 'entry_id required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_KEY')!,
    );

    // Fetch entry
    const { data: entry, error: entryErr } = await supabase
      .from('competition_entries_v2')
      .select('id, media_url, votes, watch_time_seconds')
      .eq('id', entry_id)
      .single();

    if (entryErr || !entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), { status: 404 });
    }

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const generated: Array<{ duration_s: number; clip_url: string }> = [];

    if (cloudName && entry.media_url) {
      for (const dur of CLIP_DURATIONS) {
        try {
          // Vertical crop (9:16), trimmed to duration, auto-quality
          const clipUrl = `https://res.cloudinary.com/${cloudName}/video/upload/c_fill,w_720,h_1280,g_auto,so_0,du_${dur},q_auto,f_mp4/${encodeURIComponent(entry.media_url)}`;

          // Upload clip URL to storage bucket reference
          const clipPath = `competition-clips/${entry_id}/${dur}s.mp4`;

          const { error: updateErr } = await supabase
            .from('competition_clips')
            .update({
              clip_url: clipUrl,
              status: 'done',
              platform: 'all',
            })
            .eq('entry_id', entry_id)
            .eq('duration_s', dur);

          if (updateErr) {
            console.error(`Clip ${dur}s update error:`, updateErr);
          } else {
            generated.push({ duration_s: dur, clip_url: clipUrl });
          }
        } catch (e) {
          console.error(`Clip ${dur}s generation error:`, e);
          await supabase.from('competition_clips')
            .update({ status: 'failed' })
            .eq('entry_id', entry_id)
            .eq('duration_s', dur);
        }
      }
    } else {
      console.warn('Cloudinary not configured — skipping clip generation');
      await supabase.from('competition_clips')
        .update({ status: 'failed' })
        .eq('entry_id', entry_id);
    }

    // Recalculate ranking score
    const { data: subtitleCount } = await supabase
      .from('competition_subtitles')
      .select('id', { count: 'exact', head: true })
      .eq('entry_id', entry_id)
      .eq('status', 'done');

    const { data: clipData } = await supabase
      .from('competition_clips')
      .select('clip_views, social_shares')
      .eq('entry_id', entry_id);

    const totalClipViews  = clipData?.reduce((sum, c) => sum + (c.clip_views  ?? 0), 0) ?? 0;
    const totalSocialShare = clipData?.reduce((sum, c) => sum + (c.social_shares ?? 0), 0) ?? 0;
    const subLangs         = (subtitleCount as unknown as { count: number } | null)?.count ?? 0;
    const votes            = entry.votes ?? 0;
    const watchTime        = entry.watch_time_seconds ?? 1;

    const rankingScore = (
      votes *
      Math.max(watchTime, 1) *
      Math.max(subLangs, 1) *
      Math.max(totalClipViews + 1, 1) *
      Math.max(totalSocialShare + 1, 1)
    );

    // Boost description: score += subtitle_languages * 5
    const finalScore = rankingScore + subLangs * 5;

    await supabase.from('competition_entries_v2')
      .update({ ranking_score: finalScore })
      .eq('id', entry_id);

    return new Response(JSON.stringify({
      success: true,
      entry_id,
      clips_generated: generated.length,
      clips: generated,
      ranking_score: finalScore,
      subtitle_languages: subLangs,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate-clips]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
