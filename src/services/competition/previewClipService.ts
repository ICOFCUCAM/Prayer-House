import { supabase } from '@/lib/supabase';

// ── generatePreviewClip ────────────────────────────────────────
// Production: call a video-processing serverless function (e.g. ffmpeg on
// Supabase Edge Function or AWS Lambda) to extract a 20–45 second highlight.
// Here we simulate the call and return a placeholder URL.
export async function generatePreviewClip(
  entryId: string,
  videoUrl: string,
): Promise<string> {
  // In production, call your edge function:
  // const { data } = await supabase.functions.invoke('generate-preview-clip', {
  //   body: { entryId, videoUrl, startSec: 30, durationSec: 30 }
  // });
  // return data.preview_url;

  // Simulation: mirror the original URL with a _preview suffix
  const previewUrl = videoUrl.replace(/(\.[^.]+)$/, '_preview$1');

  const { error } = await supabase
    .from('competition_entries_v2')
    .update({
      preview_clip_url: previewUrl,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', entryId);

  if (error) throw new Error(`Preview clip update failed: ${error.message}`);

  return previewUrl;
}

// ── validateVideoDuration ──────────────────────────────────────
export function validateVideoDuration(durationSeconds: number): {
  valid: boolean;
  message: string;
} {
  const MIN = 120; // 2 minutes
  const MAX = 480; // 8 minutes
  if (durationSeconds < MIN) {
    return { valid: false, message: `Video too short (${Math.round(durationSeconds)}s). Minimum is 2 minutes.` };
  }
  if (durationSeconds > MAX) {
    return { valid: false, message: `Video too long (${Math.round(durationSeconds)}s). Maximum is 8 minutes.` };
  }
  return { valid: true, message: 'Duration valid.' };
}

// ── extractVideoMetadata ──────────────────────────────────────
export function extractVideoMetadata(file: File): Promise<{
  duration: number;
  resolution: string;
}> {
  return new Promise((resolve, reject) => {
    const video    = document.createElement('video');
    const url      = URL.createObjectURL(file);
    video.src      = url;
    video.preload  = 'metadata';
    video.onloadedmetadata = () => {
      const duration   = video.duration;
      const resolution = `${video.videoWidth}x${video.videoHeight}`;
      URL.revokeObjectURL(url);
      resolve({ duration, resolution });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata.'));
    };
  });
}
