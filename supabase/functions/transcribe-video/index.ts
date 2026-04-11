/**
 * WANKONG — transcribe-video Edge Function
 *
 * Triggered after a competition entry video is uploaded.
 * Pipeline:
 *   1. Fetch video URL for the given entry_id
 *   2. Call speech-to-text API (OpenAI Whisper via API)
 *   3. Store transcript in competition_transcripts
 *   4. Generate WebVTT subtitles in source language
 *   5. Dispatch subtitle translation jobs for 15 target languages
 *   6. Generate short clips: 30s, 60s, 90s via FFmpeg worker
 *   7. Update entry ranking_score
 *
 * Invocation:
 *   POST /functions/v1/transcribe-video
 *   Body: { entry_id: string }
 *
 * Environment variables required:
 *   OPENAI_API_KEY        — Whisper API key
 *   SUPABASE_URL          — injected automatically
 *   SUPABASE_SERVICE_KEY  — injected automatically
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUBTITLE_LANGUAGES = [
  { code: 'en',  name: 'English',    flag: '🇬🇧' },
  { code: 'fr',  name: 'French',     flag: '🇫🇷' },
  { code: 'no',  name: 'Norwegian',  flag: '🇳🇴' },
  { code: 'sw',  name: 'Swahili',    flag: '🇰🇪' },
  { code: 'de',  name: 'German',     flag: '🇩🇪' },
  { code: 'es',  name: 'Spanish',    flag: '🇪🇸' },
  { code: 'ar',  name: 'Arabic',     flag: '🇸🇦' },
  { code: 'zh',  name: 'Chinese',    flag: '🇨🇳' },
  { code: 'zu',  name: 'Zulu',       flag: '🇿🇦' },
  { code: 'bax', name: 'Bamumbu',    flag: '🇨🇲' },
  { code: 'lug', name: 'Luganda',    flag: '🇺🇬' },
  { code: 'ru',  name: 'Russian',    flag: '🇷🇺' },
  { code: 'pcm', name: 'Pidgin',     flag: '🇳🇬' },
  { code: 'yo',  name: 'Yoruba',     flag: '🌍'  },
  { code: 'pt',  name: 'Portuguese', flag: '🇧🇷' },
];

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

    // 1. Fetch competition entry
    const { data: entry, error: entryErr } = await supabase
      .from('competition_entries_v2')
      .select('id, media_url, media_type, room_id')
      .eq('id', entry_id)
      .single();

    if (entryErr || !entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), { status: 404 });
    }

    // 2. Insert queued transcript record
    const { error: tErr } = await supabase.from('competition_transcripts').upsert({
      entry_id,
      language: 'en',
      language_name: 'English',
      status: 'processing',
    }, { onConflict: 'entry_id,language' });

    if (tErr) console.error('Transcript upsert error:', tErr);

    // 3. Call Whisper transcription (async — fire and forget pattern)
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    let transcript = '';

    if (openaiKey && entry.media_url) {
      try {
        // Fetch audio/video as blob and send to Whisper
        const mediaResp = await fetch(entry.media_url);
        const blob = await mediaResp.blob();

        const formData = new FormData();
        formData.append('file', blob, 'media.mp4');
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'vtt');

        const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: formData,
        });

        if (whisperResp.ok) {
          transcript = await whisperResp.text(); // WebVTT format

          // Upload VTT to storage
          const vttPath = `competition-subtitles/${entry_id}/en.vtt`;
          await supabase.storage.from('video-subtitles').upload(vttPath, transcript, {
            contentType: 'text/vtt',
            upsert: true,
          });
          const { data: vttUrl } = supabase.storage.from('video-subtitles').getPublicUrl(vttPath);

          // Update transcript as done
          await supabase.from('competition_transcripts').upsert({
            entry_id,
            language: 'en',
            language_name: 'English',
            transcript,
            status: 'done',
          }, { onConflict: 'entry_id,language' });

          // Insert EN subtitle
          await supabase.from('competition_subtitles').upsert({
            entry_id,
            language: 'en',
            language_name: 'English',
            flag: '🇬🇧',
            vtt_url: vttUrl.publicUrl,
            status: 'done',
          }, { onConflict: 'entry_id,language' });
        }
      } catch (whisperErr) {
        console.error('Whisper error:', whisperErr);
        await supabase.from('competition_transcripts').update({ status: 'failed' })
          .eq('entry_id', entry_id).eq('language', 'en');
      }
    }

    // 4. Queue subtitle translation jobs for all target languages
    const subtitleInserts = SUBTITLE_LANGUAGES
      .filter(l => l.code !== 'en')
      .map(lang => ({
        entry_id,
        language: lang.code,
        language_name: lang.name,
        flag: lang.flag,
        status: 'queued' as const,
      }));

    if (subtitleInserts.length > 0) {
      await supabase.from('competition_subtitles').upsert(subtitleInserts, {
        onConflict: 'entry_id,language',
        ignoreDuplicates: true,
      });
    }

    // 5. Queue social clip generation (30s, 60s, 90s)
    const clipInserts = CLIP_DURATIONS.map(dur => ({
      entry_id,
      duration_s: dur,
      platform: 'all',
      status: 'queued' as const,
    }));

    await supabase.from('competition_clips').upsert(clipInserts, {
      onConflict: 'entry_id,duration_s',
      ignoreDuplicates: true,
    });

    // 6. Invoke generate-clips function asynchronously
    const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-clips`;
    fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}`,
      },
      body: JSON.stringify({ entry_id }),
    }).catch(console.error);

    return new Response(JSON.stringify({
      success: true,
      entry_id,
      subtitles_queued: subtitleInserts.length + 1,
      clips_queued: CLIP_DURATIONS.length,
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[transcribe-video]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
