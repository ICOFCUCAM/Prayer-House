/**
 * DistributorService
 *
 * Wraps all distributor export logic behind a stable interface so the
 * implementation detail (bundle-only today, HTTP API tomorrow) can be
 * swapped without touching callers.
 *
 * Current behaviour:   generate export bundle → store in distributor_exports
 * Future behaviour:    same + POST to distributor REST API
 */

import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SupportedDistributor = 'ditto';

export interface ValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
  /** 0–100 completeness score */
  score:    number;
  /** fields that are missing/invalid */
  missing:  string[];
}

export interface ExportBundle {
  releaseId:    string;
  distributor:  SupportedDistributor;
  metadataJson: Record<string, unknown>;
  tracklistCsv: string;
  /** path stored in distributor_exports.file_bundle_url */
  bundlePath:   string;
}

export interface ExportResult {
  success:   boolean;
  exportId?: string;
  bundle?:   ExportBundle;
  errors?:   string[];
}

// ── Validation rules ──────────────────────────────────────────────────────────

const REQUIRED_FIELDS: Array<{ key: string; label: string; path: 'release' | 'tracks' }> = [
  { key: 'cover_url',     label: 'Cover art',    path: 'release' },
  { key: 'audio_url',     label: 'Audio file',   path: 'release' },
  { key: 'title',         label: 'Release title',path: 'release' },
  { key: 'artist_name',   label: 'Artist name',  path: 'release' },
  { key: 'genre',         label: 'Genre',        path: 'release' },
  { key: 'language_code', label: 'Language',     path: 'release' },
  { key: 'release_date',  label: 'Release date', path: 'release' },
];

const RECOMMENDED_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'copyright_owner', label: 'Copyright owner' },
  { key: 'composer',        label: 'Composer'        },
  { key: 'label_name',      label: 'Label name'      },
  { key: 'isrc',            label: 'ISRC'            },
  { key: 'territories',     label: 'Territories'     },
];

// ── Service ───────────────────────────────────────────────────────────────────

class DistributorService {

  // ── validateRelease ─────────────────────────────────────────────────────────

  async validateRelease(releaseId: string): Promise<ValidationResult> {
    const errors:   string[] = [];
    const warnings: string[] = [];
    const missing:  string[] = [];

    // Fetch release
    const { data: release, error: relErr } = await supabase
      .from('distribution_releases')
      .select('*')
      .eq('id', releaseId)
      .single();

    if (relErr || !release) {
      return { valid: false, errors: ['Release not found.'], warnings, score: 0, missing };
    }

    // Required fields
    for (const { key, label } of REQUIRED_FIELDS) {
      const val = (release as Record<string, unknown>)[key];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        errors.push(`Missing required field: ${label}`);
        missing.push(label);
      }
    }

    // Recommended fields → warnings only
    for (const { key, label } of RECOMMENDED_FIELDS) {
      const val = (release as Record<string, unknown>)[key];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        warnings.push(`Recommended field missing: ${label}`);
      }
    }

    // Fetch tracks
    const { data: tracks } = await supabase
      .from('tracks')
      .select('id, title, audio_url, track_number')
      .eq('release_id', releaseId)
      .order('track_number', { ascending: true });

    const trackList = tracks ?? [];

    // For singles with no release-linked tracks, check via track_id
    if (trackList.length === 0 && release.track_id) {
      const { data: singleTrack } = await supabase
        .from('tracks')
        .select('id, title, audio_url, track_number')
        .eq('id', release.track_id)
        .single();
      if (singleTrack) trackList.push(singleTrack);
    }

    if (trackList.length === 0) {
      errors.push('No tracks found for this release.');
      missing.push('Tracks');
    } else {
      for (const t of trackList) {
        if (!(t as Record<string, unknown>).title) {
          errors.push(`Track ${(t as Record<string, unknown>).track_number ?? '?'} is missing a title.`);
          missing.push(`Track title`);
        }
        if (!(t as Record<string, unknown>).audio_url) {
          errors.push(`Track ${(t as Record<string, unknown>).track_number ?? '?'} is missing audio.`);
          missing.push(`Track audio`);
        }
      }
    }

    // Compute score (based on required + recommended, 70% required / 30% recommended)
    const reqTotal  = REQUIRED_FIELDS.length + (trackList.length === 0 ? 1 : 0);
    const reqOk     = reqTotal - errors.length;
    const recTotal  = RECOMMENDED_FIELDS.length;
    const recOk     = recTotal - warnings.length;
    const score     = Math.round(((reqOk / reqTotal) * 70) + ((recOk / recTotal) * 30));

    return {
      valid:    errors.length === 0,
      errors,
      warnings,
      score:    Math.max(0, Math.min(100, score)),
      missing,
    };
  }

  // ── exportReleaseToDistributor ──────────────────────────────────────────────
  //
  // Current:  builds the metadata bundle locally, saves to distributor_exports
  // Future:   add HTTP POST to distributor API inside _submitToApi()

  async exportReleaseToDistributor(
    releaseId:   string,
    distributor: SupportedDistributor = 'ditto',
    adminId?:    string,
  ): Promise<ExportResult> {

    // 1. Validate first
    const validation = await this.validateRelease(releaseId);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // 2. Fetch release + tracks
    const { data: release, error: relErr } = await supabase
      .from('distribution_releases')
      .select('*')
      .eq('id', releaseId)
      .single();

    if (relErr || !release) {
      return { success: false, errors: ['Release not found during export.'] };
    }

    const { data: tracksRaw } = await supabase
      .from('tracks')
      .select('id, title, audio_url, isrc, explicit, track_number, duration_s, contributors')
      .eq('release_id', releaseId)
      .order('track_number', { ascending: true });

    let trackRows = (tracksRaw ?? []) as Record<string, unknown>[];

    if (trackRows.length === 0 && release.track_id) {
      const { data: single } = await supabase
        .from('tracks')
        .select('id, title, audio_url, isrc, explicit, track_number, duration_s, contributors')
        .eq('id', release.track_id)
        .single();
      if (single) trackRows = [single as Record<string, unknown>];
    }

    // 3. Build metadata.json
    const metadataJson: Record<string, unknown> = {
      release_title:  release.title,
      artist_name:    release.artist_name,
      release_type:   release.release_type,
      genre:          release.genre,
      language:       release.language_code,
      territories:    release.territories ?? [],
      release_date:   release.release_date,
      cover_url:      release.cover_url,
      copyright:      release.copyright_owner ?? `© ${new Date().getFullYear()} ${release.artist_name}`,
      composer:       release.composer ?? release.artist_name,
      producer:       release.producer ?? '',
      label:          release.label_name ?? release.artist_name,
      explicit:       release.explicit,
      isrc:           release.isrc,
      track_count:    trackRows.length,
      release_id:     release.id,
      platforms:      ['spotify', 'apple_music', 'tiktok', 'youtube_music', 'boomplay', 'audiomack'],
      exported_at:    new Date().toISOString(),
      distributor,
    };

    // 4. Build tracklist.csv
    const csvHeader = 'track_number,track_title,contributors,duration,explicit_flag,audio_url,isrc';
    const csvRows   = trackRows.map(t => {
      const contributors = Array.isArray(t.contributors)
        ? (t.contributors as string[]).join(' / ')
        : '';
      const duration     = t.duration_s ? String(t.duration_s) : '';
      return `${t.track_number ?? 1},"${String(t.title ?? '').replace(/"/g, '""')}","${contributors}",${duration},${t.explicit ? 'true' : 'false'},"${t.audio_url ?? ''}","${t.isrc ?? ''}"`;
    });
    const tracklistCsv = [csvHeader, ...csvRows].join('\n');

    // 5. Bundle path (logical path; no filesystem in browser — stored as metadata in DB)
    const bundlePath = `exports/releases/${releaseId}/`;

    const bundle: ExportBundle = { releaseId, distributor, metadataJson, tracklistCsv, bundlePath };

    // 6. Save to distributor_exports
    const mockDittoId = `DITTO-${Date.now()}-${releaseId.slice(0, 8).toUpperCase()}`;

    const { data: exportRow, error: exportErr } = await supabase
      .from('distributor_exports')
      .insert([{
        release_id:     releaseId,
        distributor,
        export_status:  'submitted',
        export_payload: metadataJson,
        file_bundle_url: bundlePath,
        admin_id:       adminId ?? null,
        created_at:     new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (exportErr) {
      return { success: false, errors: [`Export record failed: ${exportErr.message}`] };
    }

    // 7. Update release status + ditto id
    await supabase
      .from('distribution_releases')
      .update({
        status:           'sent_to_ditto',
        ditto_release_id: mockDittoId,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', releaseId);

    // 8. ── FUTURE API HOOK ───────────────────────────────────────────────────
    // Uncomment and implement _submitToApi() when the distributor API key is ready:
    //
    // try {
    //   const apiResponse = await this._submitToApi(distributor, bundle);
    //   await supabase.from('distributor_exports').update({
    //     export_status: 'submitted',
    //     response: apiResponse,
    //     updated_at: new Date().toISOString(),
    //   }).eq('id', exportRow.id);
    // } catch (apiErr) {
    //   await supabase.from('distributor_exports').update({
    //     export_status: 'failed',
    //     response: { error: String(apiErr) },
    //     updated_at: new Date().toISOString(),
    //   }).eq('id', exportRow.id);
    // }
    // ────────────────────────────────────────────────────────────────────────

    return { success: true, exportId: exportRow.id, bundle };
  }

  // ── _submitToApi (future) ───────────────────────────────────────────────────
  // Stubbed out — replace body when API key is available.
  private async _submitToApi(
    distributor: SupportedDistributor,
    bundle:      ExportBundle,
  ): Promise<Record<string, unknown>> {
    const endpoints: Record<SupportedDistributor, string> = {
      ditto: 'https://api.dittomusic.com/v1/releases',
    };
    const apiKeyEnvs: Record<SupportedDistributor, string | undefined> = {
      ditto: import.meta.env.VITE_DITTO_API_KEY,
    };

    const endpoint = endpoints[distributor];
    const apiKey   = apiKeyEnvs[distributor];
    if (!apiKey) throw new Error(`API key for ${distributor} not configured.`);

    const response = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bundle.metadataJson),
    });

    if (!response.ok) throw new Error(`${distributor} API error: ${response.status}`);
    return (await response.json()) as Record<string, unknown>;
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const distributorService = new DistributorService();
