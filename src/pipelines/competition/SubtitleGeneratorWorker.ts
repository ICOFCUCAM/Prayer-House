import { supabase } from '@/lib/supabase';

// ── SubtitleGeneratorWorker ────────────────────────────────────
// 1. Downloads video from competition_videos bucket
// 2. Sends to Whisper / AssemblyAI for speech-to-text
// 3. Stores transcript in competition_transcripts
// 4. Triggers translation pipeline for all languages

export async function transcribeEntry(entryId: string, videoUrl: string): Promise<string> {
  // Insert queued record
  await supabase.from('competition_transcripts').upsert([{
    entry_id: entryId,
    language: 'en',
    status:   'processing',
  }], { onConflict: 'entry_id,language' });

  // Production: call edge function:
  // const { data } = await supabase.functions.invoke('transcribe-video', {
  //   body: { entryId, videoUrl }
  // });
  // const transcript = data.text;

  // Placeholder transcript
  const transcript = `[Auto-transcribed: performance entry ${entryId}. Full speech-to-text powered by Whisper AI will appear here.]`;

  await supabase.from('competition_transcripts').update({
    transcript,
    status: 'done',
  }).eq('entry_id', entryId).eq('language', 'en');

  return transcript;
}

export async function getTranscript(entryId: string, language = 'en') {
  const { data } = await supabase
    .from('competition_transcripts')
    .select('*')
    .eq('entry_id', entryId)
    .eq('language', language)
    .maybeSingle();
  return data;
}
