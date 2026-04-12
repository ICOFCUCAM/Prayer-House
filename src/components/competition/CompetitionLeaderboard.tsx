import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id:             string;
  title:          string;
  performer_name: string | null;
  thumbnail_url:  string | null;
  votes_count:    number;
  ai_score:       number | null;
  rank:           number;
  prev_rank:      number;
  delta:          number;          // votes gained since last refresh
}

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS = ['#FFB800', '#C0C0C0', '#CD7F32'];

// ── Component ──────────────────────────────────────────────────────────────────

export default function CompetitionLeaderboard({
  roomId,
  isLive = false,
}: {
  roomId:  string;
  isLive?: boolean;
}) {
  const [entries,    setEntries]    = useState<LeaderboardEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const prevVotes    = useRef<Record<string, number>>({});

  const buildRanked = useCallback((rows: any[]): LeaderboardEntry[] => {
    const sorted = [...rows].sort((a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0));
    return sorted.map((r, i) => ({
      id:             r.id,
      title:          r.title,
      performer_name: r.performer_name,
      thumbnail_url:  r.thumbnail_url,
      votes_count:    r.votes_count ?? 0,
      ai_score:       r.ai_score ?? null,
      rank:           i + 1,
      prev_rank:      i + 1,       // will be updated on next refresh
      delta:          (r.votes_count ?? 0) - (prevVotes.current[r.id] ?? r.votes_count ?? 0),
    }));
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('competition_entries_v2')
      .select('id, title, performer_name, thumbnail_url, votes_count, ai_score')
      .eq('room_id', roomId)
      .order('votes_count', { ascending: false })
      .limit(20);

    if (!data) return;

    setEntries(prev => {
      // Build a rank map from previous state
      const prevRankMap: Record<string, number> = {};
      prev.forEach(e => { prevRankMap[e.id] = e.rank; });

      // Record prev votes for delta calc
      const newVoteMap: Record<string, number> = {};
      data.forEach((r: any) => { newVoteMap[r.id] = r.votes_count ?? 0; });

      const ranked = [...data]
        .sort((a: any, b: any) => (b.votes_count ?? 0) - (a.votes_count ?? 0))
        .map((r: any, i: number): LeaderboardEntry => ({
          id:             r.id,
          title:          r.title,
          performer_name: r.performer_name,
          thumbnail_url:  r.thumbnail_url,
          votes_count:    r.votes_count ?? 0,
          ai_score:       r.ai_score ?? null,
          rank:           i + 1,
          prev_rank:      prevRankMap[r.id] ?? i + 1,
          delta:          (r.votes_count ?? 0) - (prevVotes.current[r.id] ?? r.votes_count ?? 0),
        }));

      prevVotes.current = newVoteMap;
      return ranked;
    });
    setLastUpdate(new Date());
    setLoading(false);
  }, [roomId]);

  // Initial load
  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // Real-time vote updates for live competitions
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel(`leaderboard-${roomId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'competition_entries_v2',
          filter: `room_id=eq.${roomId}`,
        },
        () => { fetchLeaderboard(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, isLive, fetchLeaderboard]);

  const RankChange = ({ entry }: { entry: LeaderboardEntry }) => {
    const diff = entry.prev_rank - entry.rank;
    if (diff === 0) return <Minus className="w-3 h-3 text-white/25" />;
    if (diff > 0)   return (
      <span className="flex items-center gap-0.5 text-emerald-400">
        <TrendingUp className="w-3 h-3" />
        <span className="text-[10px] font-bold">{diff}</span>
      </span>
    );
    return (
      <span className="flex items-center gap-0.5 text-red-400">
        <TrendingDown className="w-3 h-3" />
        <span className="text-[10px] font-bold">{Math.abs(diff)}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 animate-pulse h-14" />
        ))}
      </div>
    );
  }

  if (!entries.length) return null;

  const maxVotes = entries[0]?.votes_count || 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FFB800]" />
          Leaderboard
        </h3>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
              <Zap className="w-2.5 h-2.5" />
              LIVE
            </span>
          )}
          {lastUpdate && (
            <span className="text-white/20 text-[10px]">
              Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {entries.map(e => {
          const isTop3 = e.rank <= 3;
          const pct    = (e.votes_count / maxVotes) * 100;
          const color  = isTop3 ? PODIUM_COLORS[e.rank - 1] : '#6B7280';

          return (
            <Link
              key={e.id}
              to={`/competition/watch/${e.id}`}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all hover:scale-[1.01] ${
                isTop3
                  ? 'border-opacity-30 bg-opacity-5'
                  : 'border-white/8 bg-white/3 hover:bg-white/5'
              }`}
              style={isTop3 ? { borderColor: `${color}40`, background: `${color}08` } : undefined}
            >
              {/* Rank medal or number */}
              <div className="w-8 text-center shrink-0">
                {isTop3
                  ? <span className="text-xl">{MEDALS[e.rank - 1]}</span>
                  : <span className="text-white/40 text-sm font-black">{e.rank}</span>}
              </div>

              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0">
                {e.thumbnail_url
                  ? <img src={e.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/20" />}
              </div>

              {/* Info + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-sm font-semibold truncate">{e.performer_name || e.title}</p>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <RankChange entry={e} />
                    {e.delta > 0 && (
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                        +{e.delta}
                      </span>
                    )}
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>
                      {e.votes_count.toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Vote bar */}
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
