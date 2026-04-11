import { supabase } from '@/lib/supabase';
import { translateSubtitles, getEntrySubtitles } from '@/pipelines/translation/TranslateSubtitlesWorker';
import { transcribeEntry } from '@/pipelines/competition/SubtitleGeneratorWorker';

// ── CompetitionSubtitleService ────────────────────────────────
// Orchestrates the full subtitle pipeline: transcribe → translate → store.

export async function runFullSubtitlePipeline(entryId: string, videoUrl: string): Promise<void> {
  // Step 1: Transcribe to English
  await transcribeEntry(entryId, videoUrl);
  // Step 2: Translate to all subtitle languages
  await translateSubtitles(entryId);
}

export async function getSubtitleLanguages(entryId: string): Promise<string[]> {
  const subs = await getEntrySubtitles(entryId);
  return subs.map((s: any) => s.language);
}

export async function getSubtitleUrl(entryId: string, language: string): Promise<string | null> {
  const { data } = await supabase
    .from('competition_subtitles')
    .select('vtt_url')
    .eq('entry_id', entryId)
    .eq('language', language)
    .eq('status', 'done')
    .maybeSingle();
  return data?.vtt_url ?? null;
}

export { getEntrySubtitles };
