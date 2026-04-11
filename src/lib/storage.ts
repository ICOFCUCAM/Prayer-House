import { supabase } from './supabase';

/**
 * Upload a file to a Supabase storage bucket and return its public URL.
 * Uses XMLHttpRequest to track progress if onProgress is provided;
 * otherwise uses the supabase SDK with upsert:true.
 *
 * @param bucket     - Storage bucket name
 * @param path       - Object path within the bucket
 * @param file       - The File to upload
 * @param onProgress - Optional callback receiving progress percentage 0–100
 * @returns          - Public URL of the uploaded object
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (onProgress) {
    // XHR path for progress tracking
    const supabaseUrl: string = (supabase as any).supabaseUrl;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token: string =
      session?.access_token ?? (supabase as any).supabaseKey;

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          resolve(data.publicUrl);
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try {
            const body = JSON.parse(xhr.responseText);
            msg = body?.message ?? body?.error?.message ?? msg;
          } catch {
            // ignore
          }
          reject(new Error(msg));
        }
      });

      xhr.addEventListener('error', () =>
        reject(new Error('Network error during file upload'))
      );
      xhr.addEventListener('abort', () =>
        reject(new Error('File upload was aborted'))
      );

      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }

  // No progress tracking — use SDK
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });

  if (error) throw new Error(error.message);

  return getPublicUrl(bucket, path);
}

/**
 * Delete a file from a Supabase storage bucket.
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}

/**
 * Get the public URL for a stored file without making a network request.
 */
export function getPublicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Upload a file with upsert (overwrite if exists), no progress tracking.
 * Returns the public URL.
 */
export async function upsertFile(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  });

  if (error) throw new Error(error.message);

  return getPublicUrl(bucket, path);
}
