import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Room {
  id: string; title: string; category: string; prize_description?: string;
  status: string; close_at?: string; entry_count?: number;
}

function Countdown({ closeAt }: { closeAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = new Date(closeAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Closed'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [closeAt]);
  return <span className="text-[#FF6B00] font-mono font-bold text-sm">{timeLeft}</span>;
}

const MOCK_ROOMS: Room[] = [
  { id: 'r1', title: 'Gospel Voices Championship', category: 'Gospel', prize_description: '$500 cash + global distribution', status: 'open', close_at: new Date(Date.now() + 2 * 86400000).toISOString(), entry_count: 24 },
  { id: 'r2', title: 'Worship Leaders Showcase', category: 'Worship', prize_description: '$300 + record deal intro', status: 'open', close_at: new Date(Date.now() + 5 * 86400000).toISOString(), entry_count: 17 },
  { id: 'r3', title: 'African Talent Hunt', category: 'Open', prize_description: '$1,000 grand prize', status: 'open', close_at: new Date(Date.now() + 10 * 86400000).toISOString(), entry_count: 41 },
];

const MOCK_WINNERS = [
  { title: 'Amazing Grace — Live', performer: 'Adaeze Obi', category: 'Gospel', votes: 1247, room: 'Spring Gospel Cup' },
  { title: 'Spontaneous Worship', performer: 'Kofi Mensah', category: 'Worship', votes: 934, room: 'Worship Night Live' },
];

export default function TalentArenaCollectionPage() {
  const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);

  useEffect(() => {
    supabase.from('competition_rooms').select('*').eq('status', 'open')
      .then(({ data }) => { if (data && data.length > 0) setRooms(data); });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF6B00]/20 to-[#FFB800]/10 border-b border-white/5 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-white/40 text-sm mb-4">
            <Link to="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Talent Arena</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">🎭 Talent Arena</h1>
          <p className="text-white/50 text-lg">Compete, get voted on by the world, win cash prizes and global distribution.</p>
          <Link
            to="/talent-arena/upload"
            className="inline-block mt-6 bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-black font-black px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Submit Your Performance
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Active rooms */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse inline-block" />
            Live Competitions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white/5 border border-white/10 hover:border-[#FF6B00]/50 rounded-2xl p-6 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs bg-[#FF6B00]/20 text-[#FF6B00] px-2 py-0.5 rounded-full font-semibold">{room.category}</span>
                  <span className="text-[10px] bg-[#00F5A0]/10 text-[#00F5A0] px-2 py-0.5 rounded-full font-bold uppercase">OPEN</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{room.title}</h3>
                {room.prize_description && (
                  <p className="text-[#FFB800] text-sm font-semibold mb-3">🏆 {room.prize_description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">{room.entry_count ?? 0} entries</span>
                  {room.close_at && <Countdown closeAt={room.close_at} />}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/talent-arena/room/${room.id}`}
                    className="flex-1 text-center py-2 rounded-lg border border-white/20 text-white/70 text-sm hover:border-[#00D9FF] hover:text-[#00D9FF] transition-colors"
                  >
                    Watch
                  </Link>
                  <Link
                    to="/talent-arena/upload"
                    className="flex-1 text-center py-2 rounded-lg bg-[#FF6B00] text-white text-sm font-semibold hover:bg-[#FF6B00]/80 transition-colors"
                  >
                    Enter
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent winners */}
        <div>
          <h2 className="text-2xl font-black text-white mb-6">🥇 Recent Winners</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_WINNERS.map((w, i) => (
              <div key={i} className="flex items-center gap-4 bg-gradient-to-r from-[#FFB800]/10 to-transparent border border-[#FFB800]/20 rounded-xl p-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FFB800] to-[#FF6B00] flex items-center justify-center text-2xl shrink-0">🏆</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{w.title}</p>
                  <p className="text-white/50 text-sm">{w.performer}</p>
                  <p className="text-white/30 text-xs">{w.room} · {w.votes.toLocaleString()} votes</p>
                </div>
                <span className="text-xs bg-[#FFB800]/20 text-[#FFB800] px-2 py-0.5 rounded-full shrink-0">{w.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
