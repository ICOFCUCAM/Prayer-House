import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Entry {
  id: string; room_id: string; user_id: string; title: string;
  performer_name?: string; video_url?: string; thumbnail_url?: string;
  category?: string; language?: string; votes_count: number; ai_score?: number; status: string;
}

interface Subtitle { id: string; language: string; vtt_url: string; }
interface Clip { id: string; duration_s: number; clip_url: string; }

export default function WatchPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [related, setRelated] = useState<Entry[]>([]);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [votes, setVotes] = useState(0);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entryId) return;
    Promise.all([
      supabase.from('competition_entries_v2').select('*').eq('id', entryId).single(),
      supabase.from('competition_subtitles').select('*').eq('entry_id', entryId).eq('status', 'done'),
      supabase.from('competition_clips').select('*').eq('entry_id', entryId).eq('status', 'done').order('duration_s'),
    ]).then(([{ data: e }, { data: subs }, { data: cl }]) => {
      if (e) {
        setEntry(e);
        setVotes(e.votes_count ?? 0);
        // fetch related
        supabase.from('competition_entries_v2')
          .select('*').eq('room_id', e.room_id).neq('id', entryId).limit(3)
          .then(({ data: rel }) => setRelated(rel ?? []));
      }
      setSubtitles(subs ?? []);
      setClips(cl ?? []);
      setLoading(false);
    });
  }, [entryId]);

  // Realtime votes
  useEffect(() => {
    if (!entryId) return;
    const ch = supabase.channel(`votes-watch-${entryId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'competition_votes', filter: `entry_id=eq.${entryId}` }, () => {
        setVotes(v => v + 1);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [entryId]);

  const castVote = async () => {
    if (voted || !entryId) return;
    setVoted(true);
    setVotes(v => v + 1);
    await supabase.from('competition_votes').insert({ entry_id: entryId });
    await supabase.from('competition_entries_v2').update({ votes_count: votes + 1 }).eq('id', entryId);
  };

  const selectSubtitle = (lang: string | null) => {
    setSelectedLang(lang);
    const video = videoRef.current;
    if (!video) return;
    // Remove existing tracks
    Array.from(video.querySelectorAll('track')).forEach(t => t.remove());
    if (lang) {
      const sub = subtitles.find(s => s.language === lang);
      if (sub) {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = lang.toUpperCase();
        track.src = sub.vtt_url;
        track.default = true;
        video.appendChild(track);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return <div className="min-h-screen bg-[#0A1128] flex items-center justify-center text-white">Entry not found.</div>;
  }

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-white/40 text-sm mb-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <Link to="/collections/talent-arena" className="hover:text-white">Talent Arena</Link>
          <span>/</span>
          <span className="text-white truncate">{entry.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main video */}
          <div className="lg:col-span-2">
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video mb-4">
              {entry.video_url ? (
                <video
                  ref={videoRef}
                  src={entry.video_url}
                  controls
                  poster={entry.thumbnail_url}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/40 to-[#00D9FF]/20 flex items-center justify-center">
                  <span className="text-5xl">🎤</span>
                </div>
              )}
            </div>

            {/* Subtitle selector */}
            {subtitles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-white/40 text-xs uppercase tracking-wider">Subtitles:</span>
                <button
                  onClick={() => selectSubtitle(null)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${!selectedLang ? 'bg-[#00D9FF]/20 border-[#00D9FF] text-[#00D9FF]' : 'border-white/20 text-white/50 hover:border-white/40'}`}
                >
                  Off
                </button>
                {subtitles.map(sub => (
                  <button
                    key={sub.language}
                    onClick={() => selectSubtitle(sub.language)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${selectedLang === sub.language ? 'bg-[#00D9FF]/20 border-[#00D9FF] text-[#00D9FF]' : 'border-white/20 text-white/50 hover:border-white/40'}`}
                  >
                    {sub.language.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Clips */}
            {clips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-white/40 text-xs uppercase tracking-wider self-center">Clips:</span>
                {clips.map(clip => (
                  <a key={clip.id} href={clip.clip_url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-[#9D4EDD]/20 border border-[#9D4EDD]/40 text-[#9D4EDD] hover:bg-[#9D4EDD]/30 transition-colors">
                    {clip.duration_s}s clip
                  </a>
                ))}
              </div>
            )}

            <h1 className="text-2xl font-black text-white mb-1">{entry.title}</h1>
            <p className="text-white/50">{entry.performer_name ?? 'Unknown Performer'}</p>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-black text-[#00D9FF]">{votes.toLocaleString()}</div>
                  <div className="text-white/40 text-xs">Community Votes</div>
                </div>
                {entry.ai_score != null && (
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#9D4EDD]">{entry.ai_score.toFixed(1)}</div>
                    <div className="text-white/40 text-xs">AI Score</div>
                  </div>
                )}
              </div>
              <button
                onClick={castVote}
                disabled={voted}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${voted ? 'bg-[#00F5A0]/20 text-[#00F5A0] cursor-default' : 'bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-black hover:opacity-90'}`}
              >
                {voted ? '❤ Voted!' : '❤ Vote for this performance'}
              </button>

              <div className="mt-4 space-y-2 text-sm">
                {entry.category && <div className="flex justify-between"><span className="text-white/40">Category</span><span className="text-white">{entry.category}</span></div>}
                {entry.language && <div className="flex justify-between"><span className="text-white/40">Language</span><span className="text-white">{entry.language.toUpperCase()}</span></div>}
                <div className="flex justify-between"><span className="text-white/40">Status</span><span className={entry.status === 'winner' ? 'text-[#FFB800] font-bold' : 'text-[#00F5A0]'}>{entry.status}</span></div>
              </div>
            </div>

            {/* Related */}
            {related.length > 0 && (
              <div>
                <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">More from this room</h3>
                <div className="space-y-3">
                  {related.map(rel => (
                    <Link key={rel.id} to={`/competition/watch/${rel.id}`} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#9D4EDD]/40 to-[#00D9FF]/20 flex items-center justify-center shrink-0">
                        <span className="text-lg">🎤</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{rel.title}</p>
                        <p className="text-white/40 text-xs">❤ {rel.votes_count}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
