import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { submitRelease } from '@/services/distribution/dittoDistributionService';
import {
  CheckCircle, XCircle, Eye, Music, Loader2, Send,
  Clock, Radio, AlertCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PendingRelease {
  id:              string;
  track_id:        string | null;
  ecom_product_id: string | null;
  user_id:         string | null;
  title:           string;
  artist_name:     string;
  genre:           string | null;
  release_type:    string;
  cover_url:       string | null;
  audio_url:       string | null;
  explicit:        boolean;
  release_date:    string | null;
  status:          string;
  submitted_at:    string | null;
  isrc:            string | null;
  copyright_owner: string | null;
  composer:        string | null;
  producer:        string | null;
  label_name:      string | null;
  track_count:     number;
  ditto_release_id: string | null;
  admin_note:      string | null;
}

type ActionState = 'idle' | 'approving' | 'submitting' | 'rejecting';

const inputCls =
  'w-full bg-[#0A1128] border border-white/10 rounded-lg px-3 py-2 text-white text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_admin_review:     { label: 'Pending Review',      color: '#FFB800' },
  approved_for_distribution:{ label: 'Approved',            color: '#00D9FF' },
  submitted_to_ditto:       { label: 'Sent to Ditto',       color: '#9D4EDD' },
  live:                     { label: 'Live',                color: '#00F5A0' },
  rejected:                 { label: 'Rejected',            color: '#FF4466' },
  priority_distribution_queue:{ label: 'Priority (Winner)', color: '#FFB800' },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminDistributionPanel() {
  const [releases,  setReleases]  = useState<PendingRelease[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [preview,   setPreview]   = useState<PendingRelease | null>(null);
  const [note,      setNote]      = useState('');
  const [action,    setAction]    = useState<ActionState>('idle');
  const [actingId,  setActingId]  = useState<string | null>(null);
  const [error,     setError]     = useState('');

  // ── Load + realtime ──────────────────────────────────────────────────────────

  const load = async () => {
    const { data } = await supabase
      .from('distribution_releases')
      .select('*')
      .in('status', ['pending_admin_review', 'priority_distribution_queue'])
      .order('submitted_at', { ascending: true });
    setReleases((data as PendingRelease[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-dist-panel')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'distribution_releases',
      }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Approve: mark approved, activate product + tracks ────────────────────────

  const approve = async (r: PendingRelease) => {
    setActingId(r.id);
    setAction('approving');
    setError('');
    try {
      // 1. Mark distribution_release as approved
      const { error: e1 } = await supabase
        .from('distribution_releases')
        .update({
          status:      'approved_for_distribution',
          approved_at: new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        })
        .eq('id', r.id);
      if (e1) throw e1;

      // 2. Activate the marketplace product
      if (r.ecom_product_id) {
        await supabase.from('ecom_products')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', r.ecom_product_id);
      }

      // 3. Activate all tracks linked to this release
      if (r.track_id) {
        await supabase.from('tracks').update({ status: 'approved' }).eq('id', r.track_id);
      } else {
        await supabase.from('tracks').update({ status: 'approved' }).eq('release_id', r.id);
      }

      // 4. Submit to Ditto (step labelled separately so admin sees progress)
      setAction('submitting');
      await submitRelease({
        releaseId:      r.id,
        trackId:        r.track_id ?? r.id,
        title:          r.title,
        artistName:     r.artist_name,
        genre:          r.genre ?? '',
        language:       r.release_type === 'single' ? (r.release_date ?? 'en') : 'en',
        releaseDate:    r.release_date ?? new Date().toISOString().slice(0, 10),
        audioUrl:       r.audio_url ?? '',
        artworkUrl:     r.cover_url ?? '',
        releaseType:    (r.release_type as 'single' | 'ep' | 'album') ?? 'single',
        copyrightOwner: r.copyright_owner ?? `© ${r.artist_name}`,
        composer:       r.composer ?? r.artist_name,
        producer:       r.producer ?? '',
        labelName:      r.label_name ?? r.artist_name,
        explicit:       r.explicit,
        isrc:           r.isrc ?? undefined,
        platforms:      ['spotify', 'apple_music', 'tiktok', 'youtube_music', 'boomplay', 'audiomack'],
      });

      setReleases(prev => prev.filter(x => x.id !== r.id));
      setPreview(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed. Please retry.');
    } finally {
      setActingId(null);
      setAction('idle');
    }
  };

  // ── Reject: mark rejected, notify artist ─────────────────────────────────────

  const reject = async (r: PendingRelease) => {
    if (!note.trim()) { setError('A rejection note is required so the artist knows what to fix.'); return; }
    setActingId(r.id);
    setAction('rejecting');
    setError('');
    try {
      await supabase.from('distribution_releases').update({
        status:     'rejected',
        admin_note: note.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', r.id);

      // Keep tracks as 'pending' so artist can fix and resubmit
      // Notify the artist via user_notifications
      if (r.user_id) {
        await supabase.from('user_notifications').insert([{
          user_id:  r.user_id,
          type:     'content',
          title:    'Release Needs Changes',
          message:  `Your release "${r.title}" was returned: ${note.trim()}`,
          read:     false,
        }]).catch(() => {});
      }

      setReleases(prev => prev.filter(x => x.id !== r.id));
      setPreview(null);
      setNote('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setActingId(null);
      setAction('idle');
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────────

  const isActing = (id: string) => actingId === id;

  const ActionLabel = ({ id }: { id: string }) => {
    if (!isActing(id)) return null;
    const labels: Record<ActionState, string> = {
      idle: '', approving: 'Approving…', submitting: 'Sending to Ditto…', rejecting: 'Rejecting…',
    };
    return (
      <span className="text-xs text-[#00D9FF] flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        {labels[action]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Music Release Queue</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Review and forward releases to Ditto Music for distribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] text-xs font-bold rounded-full">
            {releases.length} pending
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-white text-lg leading-none">✕</button>
        </div>
      )}

      {/* Empty state */}
      {releases.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl">
          <Radio className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">All caught up — no pending releases.</p>
        </div>
      )}

      {/* Release rows */}
      <div className="space-y-3">
        {releases.map(r => {
          const statusInfo = STATUS_LABELS[r.status] ?? { label: r.status, color: '#999' };
          return (
            <div
              key={r.id}
              className="flex items-center gap-4 p-4 bg-[#0D1B3E] border border-white/5 rounded-xl hover:border-white/10 transition-colors"
            >
              {/* Artwork */}
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
                {r.cover_url
                  ? <img src={r.cover_url} alt="" className="w-full h-full object-cover" />
                  : <Music className="w-5 h-5 text-white/40" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{r.title}</p>
                <p className="text-gray-500 text-xs truncate">
                  {r.artist_name} · {r.release_type.toUpperCase()} · {r.genre ?? '—'} · {r.track_count} track{r.track_count !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: statusInfo.color + '20', color: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </span>
                  {r.status === 'priority_distribution_queue' && (
                    <span className="text-[10px] text-[#FFB800]">⭐ Winner</span>
                  )}
                  {r.submitted_at && (
                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <ActionLabel id={r.id} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setPreview(r); setNote(''); setError(''); }}
                  title="Preview"
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => approve(r)}
                  disabled={isActing(r.id)}
                  title="Approve & Submit to Ditto"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00F5A0]/10 border border-[#00F5A0]/20 text-[#00F5A0] text-xs font-semibold rounded-lg hover:bg-[#00F5A0]/20 transition-colors disabled:opacity-50"
                >
                  {isActing(r.id) && action !== 'rejecting'
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Send className="w-3 h-3" />}
                  {isActing(r.id) && action === 'submitting' ? 'Sending…' : 'Approve'}
                </button>
                <button
                  onClick={() => { setPreview(r); setNote(''); setError(''); }}
                  disabled={isActing(r.id)}
                  title="Reject"
                  className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview / action modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => { setPreview(null); setError(''); }}
        >
          <div
            className="bg-[#0D1B3E] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold text-base">{preview.title}</h4>
                <p className="text-gray-400 text-xs mt-0.5">
                  by {preview.artist_name} · {preview.release_type.toUpperCase()}
                </p>
              </div>
              <button onClick={() => { setPreview(null); setError(''); }} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Artwork */}
            {preview.cover_url && (
              <img
                src={preview.cover_url}
                alt="Artwork"
                className="w-full h-52 object-cover rounded-xl"
              />
            )}

            {/* Audio preview */}
            {preview.audio_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {preview.release_type === 'single' ? 'Audio Preview' : 'Track 1 Preview'}
                </p>
                <audio controls src={preview.audio_url} className="w-full" />
              </div>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {[
                ['Genre',     preview.genre ?? '—'],
                ['Type',      preview.release_type],
                ['Tracks',    String(preview.track_count)],
                ['Language',  preview.release_date ? '—' : '—'],
                ['Explicit',  preview.explicit ? 'Yes' : 'No'],
                ['Release Date', preview.release_date ?? '—'],
                ['Label',     preview.label_name ?? '—'],
                ['ISRC',      preview.isrc ?? '—'],
                ['Copyright', preview.copyright_owner ?? '—'],
                ['Composer',  preview.composer ?? '—'],
                ['Producer',  preview.producer ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-white font-medium truncate">{v}</span>
                </div>
              ))}
            </div>

            {/* Ditto platforms */}
            <div className="bg-[#9D4EDD]/8 border border-[#9D4EDD]/20 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-[#9D4EDD] mb-2">Will be submitted to:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Spotify', 'Apple Music', 'TikTok', 'YouTube Music', 'Boomplay', 'Audiomack'].map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-gray-300">{p}</span>
                ))}
              </div>
            </div>

            {/* Error in modal */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Rejection note */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                Rejection Note <span className="text-gray-600 normal-case font-normal">(required to reject)</span>
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Explain what the artist needs to fix (e.g. artwork resolution too low, missing ISRC)…"
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </div>

            {/* Modal actions */}
            <div className="flex gap-3">
              <button
                onClick={() => approve(preview)}
                disabled={isActing(preview.id)}
                className="flex-1 py-3 bg-[#00F5A0] text-black font-bold rounded-xl text-sm hover:bg-[#00F5A0]/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isActing(preview.id) && action !== 'rejecting'
                  ? <><Loader2 className="w-4 h-4 animate-spin" />
                    {action === 'submitting' ? 'Sending to Ditto…' : 'Approving…'}</>
                  : <><CheckCircle className="w-4 h-4" /> Approve & Submit</>}
              </button>
              <button
                onClick={() => reject(preview)}
                disabled={isActing(preview.id) || !note.trim()}
                className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl text-sm hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {isActing(preview.id) && action === 'rejecting' ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
