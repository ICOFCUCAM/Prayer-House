import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Music, BookOpen, Heart, Loader2 } from 'lucide-react';

interface CreatorAnalyticsSummaryProps {
  userId: string;
}

interface StatCard {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  period: string;
}

function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

interface AnimatedStatProps {
  value: number;
  color: string;
}

const AnimatedNumber: React.FC<AnimatedStatProps> = ({ value, color }) => {
  const displayed = useCountUp(value);
  return (
    <span
      className="text-4xl font-bold tabular-nums tracking-tight"
      style={{ color }}
    >
      {displayed.toLocaleString()}
    </span>
  );
};

const CreatorAnalyticsSummary: React.FC<CreatorAnalyticsSummaryProps> = ({ userId }) => {
  const [streams, setStreams] = useState(0);
  const [booksSold, setBooksSold] = useState(0);
  const [votes, setVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      const [streamsRes, booksRes, votesRes] = await Promise.all([
        // Total streams: count rows in music_streams for tracks by this creator
        supabase
          .from('music_streams')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', userId),

        // Total book downloads/sales: sum download_count from ecom_products
        supabase
          .from('ecom_products')
          .select('download_count')
          .eq('author_id', userId),

        // Total votes: sum votes_count from competition_entries_v2
        supabase
          .from('competition_entries_v2')
          .select('votes_count')
          .eq('user_id', userId),
      ]);

      if (cancelled) return;

      if (streamsRes.error) {
        setError(streamsRes.error.message);
        setLoading(false);
        return;
      }

      setStreams(streamsRes.count ?? 0);

      const totalBooks = (booksRes.data ?? []).reduce(
        (sum, r) => sum + (Number(r.download_count) || 0),
        0
      );
      setBooksSold(totalBooks);

      const totalVotes = (votesRes.data ?? []).reduce(
        (sum, r) => sum + (Number(r.votes_count) || 0),
        0
      );
      setVotes(totalVotes);

      setLoading(false);
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [userId]);

  const stats: StatCard[] = [
    {
      key: 'streams',
      label: 'Music Streams',
      value: streams,
      icon: <Music className="w-6 h-6" />,
      accentColor: '#00D9FF',
      period: 'All Time',
    },
    {
      key: 'books',
      label: 'Books Sold',
      value: booksSold,
      icon: <BookOpen className="w-6 h-6" />,
      accentColor: '#9D4EDD',
      period: 'All Time',
    },
    {
      key: 'votes',
      label: 'Votes Received',
      value: votes,
      icon: <Heart className="w-6 h-6" />,
      accentColor: '#FFB800',
      period: 'All Time',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="bg-[#1A2240] rounded-2xl p-6 flex items-center justify-center h-36"
          >
            <Loader2 className="w-7 h-7 text-[#00D9FF] animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-6 py-4 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map(stat => (
        <div
          key={stat.key}
          className="bg-[#1A2240] rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden"
        >
          {/* Accent glow */}
          <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
            style={{ background: stat.accentColor }}
          />

          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${stat.accentColor}1a`, color: stat.accentColor }}
          >
            {stat.icon}
          </div>

          {/* Value */}
          <AnimatedNumber value={stat.value} color={stat.accentColor} />

          {/* Label + period */}
          <div className="flex flex-col gap-0.5">
            <span className="text-white font-semibold text-sm">{stat.label}</span>
            <span className="text-gray-500 text-xs">{stat.period}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CreatorAnalyticsSummary;
