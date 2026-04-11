import { supabase } from '@/lib/supabase';
import { SUBTITLE_LANGUAGES } from './LanguageMapping';

// ── TranslateSubtitlesWorker ───────────────────────────────────
// Production flow:
//   1. Fetch competition_transcripts for the entry (language = 'en')
//   2. For each target language, call translation API
//   3. Generate WebVTT file
//   4. Upload to 'video-subtitles' bucket
//   5. Store URL in competition_subtitles

export async function translateSubtitles(entryId: string): Promise<void> {
  const { data: transcript } = await supabase
    .from('competition_transcripts')
    .select('transcript')
    .eq('entry_id', entryId)
    .eq('language', 'en')
    .eq('status', 'done')
    .maybeSingle();

  if (!transcript?.transcript) return;

  for (const lang of SUBTITLE_LANGUAGES) {
    if (lang === 'en') continue; // already have source

    await supabase.from('competition_subtitles').upsert([{
      entry_id: entryId,
      language: lang,
      status:   'queued',
    }], { onConflict: 'entry_id,language' });

    // Production: translate transcript text, generate VTT, upload
    // const translated = await translateText(transcript.transcript, lang);
    // const vttContent = generateVTT(translated);
    // const url = await uploadVTT(entryId, lang, vttContent);

    const placeholderVttUrl = `${process.env.VITE_SUPABASE_URL ?? ''}/storage/v1/object/public/video-subtitles/${entryId}_${lang}.vtt`;

    await supabase.from('competition_subtitles').update({
      vtt_url: placeholderVttUrl,
      status:  'done',
    }).eq('entry_id', entryId).eq('language', lang);
  }
}

export async function getEntrySubtitles(entryId: string) {
  const { data } = await supabase
    .from('competition_subtitles')
    .select('*')
    .eq('entry_id', entryId)
    .eq('status', 'done')
    .order('language');
  return data ?? [];
}
