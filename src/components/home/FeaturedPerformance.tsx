import { useEffect, useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Winner {
  id: string;
  title: string;
  video_url?: string;
  cover_art?: string;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function FeaturedPerformance() {
  const [winner, setWinner] = useState<Winner | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from('competition_entries_v2')
      .select('id, title, video_url, cover_art')
      .eq('status', 'winner')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setWinner(data ?? null));
  }, []);

  const ytId = winner?.video_url ? extractYouTubeId(winner.video_url) : null;

  return (
    <section className="py-20 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(157,78,221,0.08),transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-full mb-4">
            <Trophy className="w-4 h-4 text-[#FFB800]" />
            <span className="text-[#FFB800] text-sm font-semibold">
              Talent Arena Winner
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
            Featured Performance of the Week
          </h2>

          <p className="text-white/40 max-w-xl mx-auto">
            Watch this week's winning performance from the WANKONG Talent Arena.
            Vote, support creators, or upload your own entry to compete globally.
          </p>
        </div>

        {/* Video — shown only when a winner with a video exists */}
        {winner && (ytId || winner.video_url) && (
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 mb-8">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              {ytId ? (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={winner.title || 'Talent Arena Winner'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  className="absolute inset-0 w-full h-full object-cover"
                  src={winner.video_url}
                  controls
                  poster={winner.cover_art}
                />
              )}
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link
            to="/collections/talent-arena"
            className="px-7 py-3 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Vote Now
          </Link>

          <Link
            to="/collections/talent-arena"
            className="px-7 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
          >
            Join Competition
          </Link>

          <Link
            to="/dashboard/artist"
            className="px-7 py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Upload Performance
          </Link>
        </div>

      </div>
    </section>
  );
}
