import { supabase } from '@/lib/supabase';

const CLIP_DURATIONS = [30, 60, 90];

// ── ClipWorker ────────────────────────────────────────────────
// Generates multiple short clips from a competition video.
// Production: call ffmpeg serverless function for actual cutting.
// Ranking score = clip_views * 0.4 + subtitle_languages * 5 + votes * 0.3 + watch_time_factor

export async function generateClips(entryId: string, videoUrl: string): Promise<void> {
  for (const dur of CLIP_DURATIONS) {
    await supabase.from('competition_clips').upsert([{
      entry_id:   entryId,
      duration_s: dur,
      status:     'queued',
    }], { onConflict: 'entry_id,duration_s' });

    // Production: supabase.functions.invoke('clip-video', { body: { entryId, videoUrl, durationSec: dur, startSec: 30 } })
    const clipUrl = videoUrl.replace(/(\.[^.]+)$/, `_clip${dur}s$1`);

    await supabase.from('competition_clips').update({
      clip_url: clipUrl,
      status:   'done',
    }).eq('entry_id', entryId).eq('duration_s', dur);
  }
}

export async function updateClipRankingScore(entryId: string): Promise<void> {
  const { data: clips } = await supabase
    .from('competition_clips')
    .select('id, clip_views, duration_s')
    .eq('entry_id', entryId);

  const { data: entry } = await supabase
    .from('competition_entries_v2')
    .select('votes_count, ai_score')
    .eq('id', entryId)
    .maybeSingle();

  const { data: subtitles } = await supabase
    .from('competition_subtitles')
    .select('id')
    .eq('entry_id', entryId)
    .eq('status', 'done');

  const subtitleCount = subtitles?.length ?? 0;
  const votes         = entry?.votes_count ?? 0;
  const aiScore       = entry?.ai_score ?? 0;

  for (const clip of (clips ?? [])) {
    const score =
      (clip.clip_views * 0.4) +
      (subtitleCount * 5) +
      (votes * 0.3) +
      (aiScore * 0.3);

    await supabase.from('competition_clips').update({ ranking_score: score }).eq('id', clip.id);
  }
}

export async function getEntryClips(entryId: string) {
  const { data } = await supabase
    .from('competition_clips')
    .select('*')
    .eq('entry_id', entryId)
    .eq('status', 'done')
    .order('duration_s');
  return data ?? [];
}
