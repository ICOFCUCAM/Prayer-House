import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Room { id: string; title: string; category?: string; status: string; }
interface Entry {
  id: string; title: string; performer_name?: string; votes_count: number;
  ai_score?: number; status: string; thumbnail_url?: string;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_COLOURS = ['#FFB800', '#C0C0C0', '#CD7F32'];

export default function ResultsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    Promise.all([
      supabase.from('competition_rooms').select('*').eq('id', roomId).single(),
      supabase.from('competition_entries_v2').select('*').eq('room_id', roomId).order('votes_count', { ascending: false }),
    ]).then(([{ data: r }, { data: e }]) => {
      setRoom(r);
      setEntries(e ?? []);
      setLoading(false);
    });
  }, [roomId]);

  if (loading) {
    return <div className="min-h-screen bg-[#0A1128] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const winner = entries[0];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-white/40 text-sm mb-8">
          <Link to="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <Link to="/collections/talent-arena" className="hover:text-white">Talent Arena</Link>
          <span>/</span>
          <span className="text-white">Results</span>
        </div>

        {/* Room header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-2">{room?.title ?? 'Competition Results'}</h1>
          <p className="text-white/40">{room?.category} · {entries.length} entries</p>
        </div>

        {/* Winner */}
        {winner && winner.status === 'winner' && (
          <div className="bg-gradient-to-r from-[#FFB800]/20 to-[#FF6B00]/10 border-2 border-[#FFB800]/50 rounded-3xl p-8 text-center mb-10">
            <div className="text-5xl mb-3">🏆</div>
            <div className="inline-block bg-[#FFB800] text-black font-black px-4 py-1 rounded-full text-sm mb-4">WINNER</div>
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#FFB800] to-[#FF6B00] flex items-center justify-center text-3xl mb-4">🎤</div>
            <h2 className="text-2xl font-black text-white mb-1">{winner.title}</h2>
            <p className="text-white/60 mb-4">{winner.performer_name}</p>
            <div className="flex justify-center gap-8">
              <div><div className="text-2xl font-black text-[#FFB800]">{winner.votes_count.toLocaleString()}</div><div className="text-white/40 text-xs">Votes</div></div>
              {winner.ai_score != null && <div><div className="text-2xl font-black text-[#9D4EDD]">{winner.ai_score.toFixed(1)}</div><div className="text-white/40 text-xs">AI Score</div></div>}
            </div>
            <Link to={`/competition/watch/${winner.id}`} className="inline-block mt-6 bg-[#FFB800] text-black font-bold px-8 py-3 rounded-xl hover:bg-[#FFB800]/80 transition-colors">
              Watch Performance
            </Link>
          </div>
        )}

        {/* Podium */}
        {podium.length > 1 && (
          <div className="mb-10">
            <h2 className="text-xl font-black text-white mb-6 text-center">Top Performers</h2>
            <div className="grid grid-cols-3 gap-4">
              {podium.map((entry, i) => (
                <Link key={entry.id} to={`/competition/watch/${entry.id}`} className="text-center group">
                  <div className="text-3xl mb-2">{MEDAL[i]}</div>
                  <div
                    className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xl mb-2 group-hover:scale-105 transition-transform border"
                    style={{ borderColor: `${PODIUM_COLOURS[i]}40` }}
                  >
                    🎤
                  </div>
                  <p className="text-white text-sm font-bold truncate">{entry.title}</p>
                  <p className="text-white/40 text-xs truncate">{entry.performer_name}</p>
                  <p className="font-bold text-sm mt-1" style={{ color: PODIUM_COLOURS[i] }}>❤ {entry.votes_count.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Full leaderboard */}
        {entries.length > 3 && (
          <div>
            <h2 className="text-xl font-black text-white mb-4">Full Leaderboard</h2>
            <div className="space-y-2">
              {entries.map((entry, i) => (
                <Link
                  key={entry.id}
                  to={`/competition/watch/${entry.id}`}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <span className="text-white/40 font-bold w-6 text-center shrink-0">#{i + 1}</span>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/20 flex items-center justify-center shrink-0 text-lg">🎤</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate text-sm">{entry.title}</p>
                    <p className="text-white/40 text-xs truncate">{entry.performer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[#00D9FF] font-bold text-sm">❤ {entry.votes_count.toLocaleString()}</div>
                    {entry.ai_score != null && <div className="text-white/30 text-xs">AI: {entry.ai_score.toFixed(1)}</div>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {entries.length === 0 && (
          <div className="text-center py-16 text-white/40">
            <div className="text-4xl mb-4">🏁</div>
            <p>No entries in this competition yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
