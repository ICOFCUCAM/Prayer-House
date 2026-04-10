import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { submitRelease } from '@/services/distribution/dittoDistributionService';
import { CheckCircle, XCircle, Eye, Music, Loader2 } from 'lucide-react';

interface PendingRelease {
  id:       string;
  track_id: string;
  status:   string;
  submitted_at: string;
  track: {
    title:       string;
    artist_id:   string;
    genre:       string;
    audio_url:   string | null;
    artwork_url: string | null;
    explicit:    boolean;
  };
  metadata: {
    release_type: string;
    release_date: string;
    copyright_owner: string;
    label_name: string;
  } | null;
}

const inputCls = "w-full bg-[#0A1128] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40";

export default function AdminDistributionPanel() {
  const [releases, setReleases] = useState<PendingRelease[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [preview,  setPreview]  = useState<PendingRelease | null>(null);
  const [note,     setNote]     = useState('');
  const [acting,   setActing]   = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('distribution_releases')
      .select('*, track:tracks(title, artist_id, genre, audio_url, artwork_url, explicit), metadata:release_metadata(*)')
      .in('status', ['pending_admin_review', 'priority_distribution_queue'])
      .order('submitted_at');
    setReleases((data as PendingRelease[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-dist')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'distribution_releases' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const approve = async (r: PendingRelease) => {
    setActing(r.id);
    try {
      await supabase
        .from('distribution_releases')
        .update({ status: 'approved_for_distribution', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', r.id);

      // Fire Ditto submission
      await submitRelease({
        trackId:        r.track_id,
        title:          r.track.title,
        artistName:     r.track.artist_id,
        genre:          r.track.genre,
        language:       'en',
        releaseDate:    r.metadata?.release_date ?? new Date().toISOString().slice(0, 10),
        audioUrl:       r.track.audio_url ?? '',
        artworkUrl:     r.track.artwork_url ?? '',
        releaseType:    (r.metadata?.release_type as any) ?? 'single',
        copyrightOwner: r.metadata?.copyright_owner ?? 'WANKONG Records',
        composer:       '',
        producer:       '',
        labelName:      r.metadata?.label_name ?? 'WANKONG Records',
        explicit:       r.track.explicit,
        platforms:      ['spotify','apple_music','tiktok','youtube_music','boomplay','audiomack'],
      });

      setReleases(prev => prev.filter(x => x.id !== r.id));
      setPreview(null);
    } finally {
      setActing(null);
    }
  };

  const reject = async (r: PendingRelease) => {
    if (!note.trim()) return alert('Please enter a rejection note.');
    setActing(r.id);
    await supabase
      .from('distribution_releases')
      .update({ status: 'rejected', admin_note: note, updated_at: new Date().toISOString() })
      .eq('id', r.id);
    setReleases(prev => prev.filter(x => x.id !== r.id));
    setPreview(null);
    setNote('');
    setActing(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-[#00D9FF] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Pending Releases</h3>
        <span className="text-xs text-gray-500">{releases.length} awaiting review</span>
      </div>

      {releases.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          All caught up — no pending releases.
        </div>
      )}

      <div className="grid gap-3">
        {releases.map(r => (
          <div key={r.id} className="flex items-center gap-4 p-4 bg-[#0D1B3E] border border-white/5 rounded-xl">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
              {r.track.artwork_url
                ? <img src={r.track.artwork_url} alt="" className="w-full h-full object-cover" />
                : <Music className="w-5 h-5 text-white/40" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{r.track.title}</p>
              <p className="text-gray-500 text-xs">{r.track.genre} · {r.metadata?.release_type ?? 'single'}</p>
              {r.status === 'priority_distribution_queue' && (
                <span className="text-[10px] font-bold text-[#FFB800]">⭐ WINNER RELEASE</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setPreview(r)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => approve(r)}
                disabled={acting === r.id}
                className="w-8 h-8 rounded-lg bg-[#00F5A0]/10 flex items-center justify-center text-[#00F5A0] hover:bg-[#00F5A0]/20 transition-colors disabled:opacity-50"
              >
                {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              </button>
              <button
                onClick={() => reject(r)}
                disabled={acting === r.id}
                className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview / Reject modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-[#0D1B3E] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-white font-bold">Review: {preview.track.title}</h4>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            {preview.track.artwork_url && (
              <img src={preview.track.artwork_url} alt="Artwork" className="w-full h-48 object-cover rounded-xl" />
            )}
            {preview.track.audio_url && (
              <audio controls src={preview.track.audio_url} className="w-full" />
            )}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <span>Genre: <span className="text-white">{preview.track.genre}</span></span>
              <span>Type: <span className="text-white">{preview.metadata?.release_type ?? '—'}</span></span>
              <span>Label: <span className="text-white">{preview.metadata?.label_name ?? '—'}</span></span>
              <span>Explicit: <span className="text-white">{preview.track.explicit ? 'Yes' : 'No'}</span></span>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Rejection note (required to reject)..."
              rows={3}
              className={inputCls + ' resize-none'}
            />
            <div className="flex gap-3">
              <button
                onClick={() => approve(preview)}
                disabled={acting === preview.id}
                className="flex-1 py-2.5 bg-[#00F5A0] text-black font-bold rounded-xl text-sm hover:bg-[#00F5A0]/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {acting === preview.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve & Submit
              </button>
              <button
                onClick={() => reject(preview)}
                disabled={acting === preview.id || !note.trim()}
                className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl text-sm hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
