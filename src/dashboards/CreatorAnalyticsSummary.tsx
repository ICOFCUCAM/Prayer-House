import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Music, BookOpen, Heart, Loader2 } from 'lucide-react';

interface CreatorAnalyticsSummaryProps {
  userId: string;
}

// ── Animated counter ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }

    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return count;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

interface StatCardProps {
  icon: React.ReactNode;
  accentColor: string;
  value: number;
  label: string;
  sublabel: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, accentColor, value, label, sublabel }) => {
  const displayed = useCountUp(value);
  return (
    <div className="bg-white/5 rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden">
      {/* Accent glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ background: accentColor }}
      />
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accentColor}1a`, color: accentColor }}
      >
        {icon}
      </div>
      {/* Large number */}
      <span
        className="text-4xl font-bold tabular-nums tracking-tight"
        style={{ color: accentColor }}
      >
        {formatNumber(displayed)}
      </span>
      {/* Label + sublabel */}
      <div className="flex flex-col gap-0.5">
        <span className="text-white font-semibold text-sm">{label}</span>
        <span className="text-gray-500 text-xs">{sublabel}</span>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const CreatorAnalyticsSummary: React.FC<CreatorAnalyticsSummaryProps> = ({ userId }) => {
  const [streams, setStreams] = useState(0);
  const [booksSold, setBooksSold] = useState(0);
  const [votes, setVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      // Fetch streams — try music_streams with user_id first, then creator_id
      let streamCount = 0;
      const streamsRes = await supabase
        .from('music_streams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (streamsRes.error) {
        // Try creator_id column
        const alt = await supabase
          .from('music_streams')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', userId);
        streamCount = alt.count ?? 0;
      } else {
        streamCount = streamsRes.count ?? 0;
      }

      // Fetch ecom_products total_downloads sum where author_id=userId
      const booksRes = await supabase
        .from('ecom_products')
        .select('total_downloads')
        .eq('author_id', userId);

      const totalDownloads = (booksRes.data ?? []).reduce(
        (sum, r) => sum + (Number(r.total_downloads) || 0), 0
      );

      // Fetch competition_entries_v2 sum of votes_count where user_id=userId
      const votesRes = await supabase
        .from('competition_entries_v2')
        .select('votes_count')
        .eq('user_id', userId);

      const totalVotes = (votesRes.data ?? []).reduce(
        (sum, r) => sum + (Number(r.votes_count) || 0), 0
      );

      if (cancelled) return;

      setStreams(streamCount);
      setBooksSold(totalDownloads);
      setVotes(totalVotes);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white/5 rounded-xl p-6 flex items-center justify-center h-36">
            <Loader2 className="w-7 h-7 text-[#00D9FF] animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-6 py-4 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Streams: cyan icon */}
      <StatCard
        icon={<Music className="w-6 h-6" />}
        accentColor="#00D9FF"
        value={streams}
        label="Music Streams 🎵"
        sublabel="All Time"
      />

      {/* Books Sold: orange icon */}
      <StatCard
        icon={<BookOpen className="w-6 h-6" />}
        accentColor="#FF6B00"
        value={booksSold}
        label="Books Sold 📚"
        sublabel="Downloads"
      />

      {/* Votes: purple icon */}
      <StatCard
        icon={<Heart className="w-6 h-6" />}
        accentColor="#9D4EDD"
        value={votes}
        label="Votes ❤"
        sublabel="Competition Votes"
      />
    </div>
  );
};

export default CreatorAnalyticsSummary;
