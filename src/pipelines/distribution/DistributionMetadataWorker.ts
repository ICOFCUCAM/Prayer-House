import { supabase } from '@/lib/supabase';

// ── DistributionMetadataWorker ─────────────────────────────────
// Validates and enriches distribution metadata for singles and albums (≤50 tracks).
// Generates ISRC codes, UPC barcodes, and platform-specific metadata packages.

export interface TrackMetadata {
  title: string;
  artist: string;
  featuring?: string;
  composer?: string;
  producer?: string;
  genre: string;
  subgenre?: string;
  language: string;
  explicit: boolean;
  isrc?: string;
  duration_s: number;
}

export interface ReleaseMetadata {
  title: string;
  artist: string;
  release_type: 'single' | 'ep' | 'album';
  release_date: string;
  label?: string;
  copyright: string;
  upc?: string;
  cover_art_url: string;
  tracks: TrackMetadata[];
}

function generateISRC(countryCode = 'NG'): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const registrant = 'WNK'; // WANKONG registrant code
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const sequence = (buf[0] % 100000).toString().padStart(5, '0');
  return `${countryCode}-${registrant}-${year}-${sequence}`;
}

function generateUPC(): string {
  // Generate 11 random digits then compute the EAN-13/UPC-A check digit
  const buf = new Uint8Array(11);
  crypto.getRandomValues(buf);
  const digits = Array.from(buf, b => b % 10);
  const check = (10 - (digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0) % 10)) % 10;
  return [...digits, check].join('');
}

export async function processReleaseMetadata(releaseId: string): Promise<ReleaseMetadata | null> {
  const { data: release } = await supabase
    .from('distribution_releases')
    .select('*, tracks(*)')
    .eq('id', releaseId)
    .maybeSingle();

  if (!release) return null;

  // Auto-assign ISRC to tracks without one
  for (const track of (release.tracks ?? [])) {
    if (!track.isrc) {
      const isrc = generateISRC();
      await supabase.from('tracks').update({ isrc }).eq('id', track.id);
      track.isrc = isrc;
    }
  }

  // Auto-assign UPC to release without one
  if (!release.upc) {
    const upc = generateUPC();
    await supabase.from('distribution_releases').update({ upc }).eq('id', releaseId);
    release.upc = upc;
  }

  return release as unknown as ReleaseMetadata;
}

export async function validateReleaseForDistribution(releaseId: string): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const metadata = await processReleaseMetadata(releaseId);
  const errors: string[] = [];

  if (!metadata) {
    return { valid: false, errors: ['Release not found'] };
  }

  if (!metadata.title?.trim()) errors.push('Release title is required');
  if (!metadata.artist?.trim()) errors.push('Artist name is required');
  if (!metadata.cover_art_url) errors.push('Cover artwork is required');
  if (!metadata.release_date) errors.push('Release date is required');
  if (!metadata.tracks?.length) errors.push('At least one track is required');
  if (metadata.tracks?.length > 50) errors.push('Albums cannot exceed 50 tracks');

  for (const track of (metadata.tracks ?? [])) {
    if (!track.title?.trim()) errors.push(`Track missing title`);
    if (!track.duration_s || track.duration_s < 30) errors.push(`Track "${track.title}" is too short (min 30s)`);
  }

  return { valid: errors.length === 0, errors };
}

export async function buildDittoPlatformPayload(releaseId: string) {
  const metadata = await processReleaseMetadata(releaseId);
  if (!metadata) return null;

  return {
    release: {
      title:        metadata.title,
      artists:      [{ name: metadata.artist, primary: true }],
      release_date: metadata.release_date,
      release_type: metadata.release_type,
      label:        metadata.label ?? 'WANKONG Independent',
      copyright:    metadata.copyright,
      upc:          metadata.upc,
      cover_art:    metadata.cover_art_url,
    },
    tracks: (metadata.tracks ?? []).map((t, i) => ({
      position:   i + 1,
      title:      t.title,
      artist:     t.artist,
      featuring:  t.featuring,
      composer:   t.composer,
      producer:   t.producer,
      genre:      t.genre,
      language:   t.language,
      explicit:   t.explicit,
      isrc:       t.isrc,
      duration_s: t.duration_s,
    })),
  };
}
