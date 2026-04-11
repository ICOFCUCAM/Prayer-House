import { supabase } from '@/lib/supabase';

// ── CompetitionTranscriptService ──────────────────────────────
// Manages transcripts for competition entries (speech-to-text).

export async function getEntryTranscript(entryId: string, language = 'en') {
  const { data } = await supabase
    .from('competition_transcripts')
    .select('*')
    .eq('entry_id', entryId)
    .eq('language', language)
    .maybeSingle();
  return data;
}

export async function getAllTranscripts(entryId: string) {
  const { data } = await supabase
    .from('competition_transcripts')
    .select('*')
    .eq('entry_id', entryId)
    .eq('status', 'done')
    .order('language');
  return data ?? [];
}

export async function hasTranscript(entryId: string): Promise<boolean> {
  const { data } = await supabase
    .from('competition_transcripts')
    .select('id')
    .eq('entry_id', entryId)
    .eq('status', 'done')
    .limit(1);
  return (data?.length ?? 0) > 0;
}
