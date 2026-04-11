import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CreatorLevelBadge from '@/components/CreatorLevelBadge';
import { Trophy, Loader2, Medal } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  level: string;
  xp: number;
  avatar_url: string | null;
}

function getRankStyle(rank: number): string {
  if (rank === 1) return 'bg-[#FFB800]/10 border border-[#FFB800]/30';
  if (rank === 2) return 'bg-[#C0C0C0]/10 border border-[#C0C0C0]/30';
  if (rank === 3) return 'bg-[#CD7F32]/10 border border-[#CD7F32]/30';
  return 'bg-[#0A1128] border border-[#1a2540]';
}

function getRankNumberStyle(rank: number): string {
  if (rank === 1) return 'text-[#FFB800] font-bold';
  if (rank === 2) return 'text-[#C0C0C0] font-bold';
  if (rank === 3) return 'text-[#CD7F32] font-bold';
  return 'text-gray-500 font-medium';
}

function getRankIcon(rank: number): React.ReactNode {
  if (rank === 1) return <Trophy className="w-4 h-4 text-[#FFB800]" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-[#C0C0C0]" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-[#CD7F32]" />;
  return null;
}

function getInitial(name: string | null, userId: string): string {
  if (name && name.trim()) return name.trim()[0].toUpperCase();
  return userId.slice(0, 2).toUpperCase();
}

function getDisplayName(entry: LeaderboardEntry): string {
  if (entry.display_name && entry.display_name.trim()) return entry.display_name.trim();
  return `${entry.user_id.slice(0, 8)}...`;
}

function getAvatarColor(str: string): string {
  const colors = ['#9D4EDD', '#00D9FF', '#FFB800', '#00F5A0', '#FF6B00'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const CreatorLeaderboard: React.FC = () => {
  const [creators, setCreators] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('creator_levels')
        .select('user_id, display_name, level, xp, avatar_url')
        .order('xp', { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setCreators((data ?? []) as LeaderboardEntry[]);
      }

      setLoading(false);
    };

    fetchLeaderboard();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1128] text-white p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#FFB800]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Global Leaderboard</h1>
            <p className="text-gray-400 text-sm">Top 50 creators ranked by XP</p>
          </div>
        </div>

        {/* Top 3 podium */}
        {!loading && !error && creators.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {/* 2nd place */}
            <div className="flex flex-col items-center gap-2 bg-[#C0C0C0]/10 border border-[#C0C0C0]/20 rounded-2xl p-4 mt-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ background: getAvatarColor(creators[1].user_id) }}
              >
                {creators[1].avatar_url
                  ? <img src={creators[1].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : getInitial(creators[1].display_name, creators[1].user_id)}
              </div>
              <Medal className="w-5 h-5 text-[#C0C0C0]" />
              <span className="text-white text-xs font-semibold text-center truncate w-full text-center">
                {getDisplayName(creators[1])}
              </span>
              <span className="text-[#C0C0C0] text-xs font-bold">
                {creators[1].xp.toLocaleString()} XP
              </span>
            </div>

            {/* 1st place */}
            <div className="flex flex-col items-center gap-2 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-2xl p-4 ring-2 ring-[#FFB800]/40 shadow-[0_0_24px_rgba(255,184,0,0.2)]">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ background: getAvatarColor(creators[0].user_id) }}
              >
                {creators[0].avatar_url
                  ? <img src={creators[0].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : getInitial(creators[0].display_name, creators[0].user_id)}
              </div>
              <Trophy className="w-5 h-5 text-[#FFB800]" />
              <span className="text-white text-xs font-bold text-center truncate w-full text-center">
                {getDisplayName(creators[0])}
              </span>
              <span className="text-[#FFB800] text-sm font-bold">
                {creators[0].xp.toLocaleString()} XP
              </span>
            </div>

            {/* 3rd place */}
            <div className="flex flex-col items-center gap-2 bg-[#CD7F32]/10 border border-[#CD7F32]/20 rounded-2xl p-4 mt-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ background: getAvatarColor(creators[2].user_id) }}
              >
                {creators[2].avatar_url
                  ? <img src={creators[2].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : getInitial(creators[2].display_name, creators[2].user_id)}
              </div>
              <Medal className="w-5 h-5 text-[#CD7F32]" />
              <span className="text-white text-xs font-semibold text-center truncate w-full text-center">
                {getDisplayName(creators[2])}
              </span>
              <span className="text-[#CD7F32] text-xs font-bold">
                {creators[2].xp.toLocaleString()} XP
              </span>
            </div>
          </div>
        )}

        {/* Full leaderboard table */}
        <div className="bg-[#1A2240] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_auto_auto] gap-2 px-4 py-3 border-b border-[#2d3a5a]">
            <span className="text-gray-500 text-xs font-semibold">#</span>
            <span className="text-gray-500 text-xs font-semibold">Creator</span>
            <span className="text-gray-500 text-xs font-semibold">Level</span>
            <span className="text-gray-500 text-xs font-semibold text-right">XP</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-sm text-center py-8">{error}</div>
          ) : creators.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">No creators found.</div>
          ) : (
            <div className="divide-y divide-[#1a2540]">
              {creators.map((creator, idx) => {
                const rank = idx + 1;
                return (
                  <div
                    key={creator.user_id}
                    className={[
                      'grid grid-cols-[48px_1fr_auto_auto] gap-2 items-center px-4 py-3 transition-colors',
                      getRankStyle(rank),
                    ].join(' ')}
                  >
                    {/* Rank */}
                    <div className={`flex items-center gap-1 text-sm ${getRankNumberStyle(rank)}`}>
                      {getRankIcon(rank) ?? <span>{rank}</span>}
                    </div>

                    {/* Creator info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden"
                        style={{ background: getAvatarColor(creator.user_id) }}
                      >
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitial(creator.display_name, creator.user_id)
                        )}
                      </div>
                      <span className="text-white text-sm font-medium truncate">
                        {getDisplayName(creator)}
                      </span>
                    </div>

                    {/* Level badge */}
                    <CreatorLevelBadge level={creator.level} />

                    {/* XP */}
                    <span className="text-[#00D9FF] font-bold text-sm tabular-nums text-right">
                      {creator.xp.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorLeaderboard;
