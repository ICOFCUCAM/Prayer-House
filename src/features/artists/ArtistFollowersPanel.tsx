import React, { useEffect, useState } from 'react';
import { Users, Loader2, UserCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── ArtistFollowersPanel ──────────────────────────────────────
// Displays total follower count and a list of recent followers.

interface ArtistFollowersPanelProps {
  artistId: string;
}

interface Follower {
  user_id: string;
  created_at: string;
  display_name: string | null;
  photo_url: string | null;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function ArtistFollowersPanel({ artistId }: ArtistFollowersPanelProps) {
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [recentFollowers, setRecentFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) return;

    async function fetchFollowers() {
      setLoading(true);
      try {
        // Total count
        const { count, error: countErr } = await supabase
          .from('artist_followers')
          .select('user_id', { count: 'exact', head: true })
          .eq('artist_id', artistId);

        if (countErr) {
          console.error('ArtistFollowersPanel count error:', countErr);
        } else {
          setFollowerCount(count ?? 0);
        }

        // Recent followers with profile join
        const { data, error: listErr } = await supabase
          .from('artist_followers')
          .select('user_id, created_at, profiles(display_name, photo_url)')
          .eq('artist_id', artistId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (listErr) {
          console.error('ArtistFollowersPanel list error:', listErr);
        } else {
          const mapped: Follower[] = (data ?? []).map((row: any) => ({
            user_id: row.user_id,
            created_at: row.created_at,
            display_name: row.profiles?.display_name ?? null,
            photo_url: row.profiles?.photo_url ?? null,
          }));
          setRecentFollowers(mapped);
        }
      } catch (err) {
        console.error('ArtistFollowersPanel error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFollowers();
  }, [artistId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin" size={28} style={{ color: '#00D9FF' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Prominent follower count */}
      <div
        className="flex items-center gap-4 p-6 rounded-2xl mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(0,217,255,0.1) 0%, rgba(0,217,255,0.04) 100%)',
          border: '1px solid rgba(0,217,255,0.2)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(0,217,255,0.15)' }}
        >
          <Users size={28} style={{ color: '#00D9FF' }} />
        </div>
        <div>
          <p
            className="text-4xl font-bold tracking-tight"
            style={{ color: '#00D9FF' }}
          >
            {formatCount(followerCount)}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            {followerCount === 1 ? 'Follower' : 'Followers'}
          </p>
        </div>
      </div>

      {/* Recent followers list */}
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Recent Followers
      </h3>

      {recentFollowers.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">No followers yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {recentFollowers.map((follower) => (
            <div
              key={`${follower.user_id}-${follower.created_at}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5"
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(157,78,221,0.15)' }}
              >
                {follower.photo_url ? (
                  <img
                    src={follower.photo_url}
                    alt={follower.display_name ?? 'Follower'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle2 size={22} style={{ color: '#9D4EDD' }} />
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {follower.display_name ?? (
                    <span className="text-gray-500">Anonymous</span>
                  )}
                </p>
              </div>

              {/* Time ago */}
              <p className="text-xs text-gray-500 shrink-0">
                {timeAgo(follower.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
