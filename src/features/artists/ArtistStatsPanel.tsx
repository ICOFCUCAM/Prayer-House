import React, { useEffect, useRef, useState } from 'react';
import { Headphones, Users, Trophy, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── ArtistStatsPanel ──────────────────────────────────────────
// Displays animated stat cards for an artist: streams, followers,
// competition wins, and total earnings.

interface ArtistStatsPanelProps {
  artistId: string;
}

interface ArtistStats {
  streams: number;
  followers: number;
  competition_wins: number;
  total_earnings: number;
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    fromRef.current = 0;
    startRef.current = null;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

function formatDisplay(n: number, prefix = ''): string {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n.toLocaleString()}`;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
}

function StatCard({ label, value, icon, color, prefix = '' }: StatCardProps) {
  const animated = useCountUp(value);
  return (
    <div
      className="flex flex-col gap-3 p-5 rounded-2xl"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)`,
        border: `1px solid ${color}30`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-2xl font-bold tracking-tight"
          style={{ color }}
        >
          {formatDisplay(animated, prefix)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function ArtistStatsPanel({ artistId }: ArtistStatsPanelProps) {
  const [stats, setStats] = useState<ArtistStats>({
    streams: 0,
    followers: 0,
    competition_wins: 0,
    total_earnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) return;

    async function fetchStats() {
      setLoading(true);
      try {
        const [artistRes, winsRes, earningsRes] = await Promise.allSettled([
          supabase
            .from('artists')
            .select('streams, followers')
            .eq('id', artistId)
            .maybeSingle(),

          supabase
            .from('competition_entries_v2')
            .select('id', { count: 'exact', head: true })
            .eq('artist_id', artistId)
            .eq('status', 'winner'),

          supabase
            .from('creator_earnings')
            .select('amount')
            .eq('artist_id', artistId),
        ]);

        const artistData =
          artistRes.status === 'fulfilled' && !artistRes.value.error
            ? artistRes.value.data
            : null;

        const winCount =
          winsRes.status === 'fulfilled' && !winsRes.value.error
            ? (winsRes.value.count ?? 0)
            : 0;

        const earningsTotal =
          earningsRes.status === 'fulfilled' && !earningsRes.value.error
            ? (earningsRes.value.data ?? []).reduce(
                (sum: number, row: any) => sum + (row.amount ?? 0),
                0,
              )
            : 0;

        setStats({
          streams: artistData?.streams ?? 0,
          followers: artistData?.followers ?? 0,
          competition_wins: winCount,
          total_earnings: Math.round(earningsTotal * 100) / 100,
        });
      } catch (err) {
        console.error('ArtistStatsPanel fetchStats error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [artistId]);

  const cardDefs = [
    {
      label: 'Total Streams',
      value: stats.streams,
      icon: <Headphones size={20} />,
      color: '#00D9FF',
    },
    {
      label: 'Followers',
      value: stats.followers,
      icon: <Users size={20} />,
      color: '#00F5A0',
    },
    {
      label: 'Competition Wins',
      value: stats.competition_wins,
      icon: <Trophy size={20} />,
      color: '#9D4EDD',
    },
    {
      label: 'Total Earnings',
      value: Math.round(stats.total_earnings),
      icon: <DollarSign size={20} />,
      color: '#FFB800',
      prefix: '$',
    },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-300 mb-4">Artist Stats</h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cardDefs.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
