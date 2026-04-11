import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.cacheDirectory}wankong_audio/`;

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Get the local path for a given track ID
 */
function getLocalPath(trackId: string): string {
  // Sanitise track ID for use as a filename
  const safe = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${CACHE_DIR}${safe}.audio`;
}

/**
 * Download an audio file to local cache and return its local URI.
 */
export async function cacheAudio(url: string, trackId: string): Promise<string> {
  await ensureCacheDir();
  const localUri = getLocalPath(trackId);

  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    return localUri;
  }

  const download = FileSystem.createDownloadResumable(url, localUri);
  const result = await download.downloadAsync();
  if (!result || !result.uri) {
    throw new Error(`Failed to cache audio for track ${trackId}`);
  }
  return result.uri;
}

/**
 * Check whether the audio for a given track ID is already cached locally.
 */
export async function isAudioCached(trackId: string): Promise<boolean> {
  const localUri = getLocalPath(trackId);
  const info = await FileSystem.getInfoAsync(localUri);
  return info.exists;
}

/**
 * Return the cached local URI for a track, or null if not cached.
 */
export async function getCachedAudioUri(trackId: string): Promise<string | null> {
  const localUri = getLocalPath(trackId);
  const info = await FileSystem.getInfoAsync(localUri);
  return info.exists ? localUri : null;
}

/**
 * Delete all cached audio files.
 */
export async function clearAudioCache(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  }
}

/**
 * Return the total size of all cached audio in megabytes.
 */
export async function getCacheSize(): Promise<number> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) return 0;

  const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
  let totalBytes = 0;

  for (const file of files) {
    const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
    if (fileInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number') {
      totalBytes += fileInfo.size;
    }
  }

  return totalBytes / (1024 * 1024);
}
