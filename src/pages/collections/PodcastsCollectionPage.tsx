import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ────────────────────────────────────────────────────────────────────

interface Podcast {
  id: string;
  title: string;
  cover_url: string | null;
  price: number;
  description: string | null;
  duration_minutes: number | null;
  episode_number: number | null;
  category: string | null;
  created_at: string;
  authors?: { name: string } | null;
}

// ── Mock Data (fallback) ──────────────────────────────────────────────────────

const MOCK_PODCASTS: Podcast[] = [
  {
    id: 'mock-1',
    title: 'Faith & Finance: Building Kingdom Wealth',
    cover_url: null,
    price: 0,
    description: 'Practical financial wisdom rooted in biblical principles for the modern creator.',
    duration_minutes: 42,
    episode_number: 1,
    category: 'Faith',
    created_at: '2026-03-01',
    authors: { name: 'Pastor David Osei' },
  },
  {
    id: 'mock-2',
    title: 'The Creative Gospel — Ep. 12: Making Music for God',
    cover_url: null,
    price: 0,
    description: 'An interview with gospel producers about the creative process and staying inspired.',
    duration_minutes: 58,
    episode_number: 12,
    category: 'Music',
    created_at: '2026-03-08',
    authors: { name: 'WANKONG Studio' },
  },
  {
    id: 'mock-3',
    title: 'African Voices: Stories of Revival',
    cover_url: null,
    price: 0,
    description: 'Testimonies and revival stories from across Sub-Saharan Africa.',
    duration_minutes: 35,
    episode_number: 5,
    category: 'Testimonies',
    created_at: '2026-03-15',
    authors: { name: 'Zion Radio' },
  },
  {
    id: 'mock-4',
    title: 'Tech & Faith: Navigating the Digital World Christianly',
    cover_url: null,
    price: 0,
    description: 'How creators can use technology wisely while staying grounded in faith.',
    duration_minutes: 47,
    episode_number: 3,
    category: 'Technology',
    created_at: '2026-03-22',
    authors: { name: 'Emmanuel Digital' },
  },
  {
    id: 'mock-5',
    title: 'Worship Leader Secrets — Building Your Sound',
    cover_url: null,
    price: 0,
    description: 'Top worship leaders share how they craft their unique sound and lead congregations.',
    duration_minutes: 63,
    episode_number: 7,
    category: 'Worship',
    created_at: '2026-03-29',
    authors: { name: 'Praise Network' },
  },
];

const CATEGORY_GRADIENTS: Record<string, string> = {
  Faith: 'from-[#9D4EDD]/40 to-[#00D9FF]/20',
  Music: 'from-[#00D9FF]/30 to-[#9D4EDD]/20',
  Testimonies: 'from-[#00F5A0]/20 to-[#00D9FF]/20',
  Technology: 'from-[#FFB800]/20 to-[#FF6B00]/20',
  Worship: 'from-[#9D4EDD]/40 to-[#FFB800]/20',
  Gospel: 'from-[#FF6B00]/20 to-[#9D4EDD]/20',
  Theology: 'from-[#00D9FF]/20 to-[#00F5A0]/20',
  Business: 'from-[#FFB800]/30 to-[#9D4EDD]/20',
};

// ── Podcast Card ──────────────────────────────────────────────────────────────

function PodcastCard({ podcast }: { podcast: Podcast }) {
  const gradient = CATEGORY_GRADIENTS[podcast.category ?? ''] ?? 'from-[#9D4EDD]/30 to-[#00D9FF]/10';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {podcast.cover_url ? (
            <img src={podcast.cover_url} alt={podcast.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">🎙️</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {podcast.episode_number != null && (
                <p className="text-[10px] text-gray-500 mb-0.5">Episode {podcast.episode_number}</p>
              )}
              <p className="font-semibold text-white text-sm line-clamp-2">{podcast.title}</p>
              <p className="text-gray-400 text-xs mt-0.5 truncate">{podcast.authors?.name ?? 'Unknown'}</p>
            </div>
            {podcast.price === 0 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00F5A0] text-[#0A1128] font-bold shrink-0">FREE</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFB800] text-[#0A1128] font-bold shrink-0">${podcast.price}</span>
            )}
          </div>

          {podcast.description && (
            <p className="text-gray-500 text-xs mt-2 line-clamp-2">{podcast.description}</p>
          )}

          <div className="flex items-center gap-3 mt-3">
            {podcast.duration_minutes != null && (
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {podcast.duration_minutes} min
              </span>
            )}
            {podcast.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">{podcast.category}</span>
            )}
            <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9D4EDD]/10 text-[#9D4EDD] border border-[#9D4EDD]/20 text-xs font-medium hover:bg-[#9D4EDD]/20 transition-colors">
              <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Listen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PodcastsCollectionPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    supabase
      .from('ecom_products')
      .select('id, title, cover_url, price, description, duration_minutes, episode_number, category, created_at, authors(name)')
      .eq('product_type', 'Podcast')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setPodcasts(data as Podcast[]);
        } else {
          setPodcasts(MOCK_PODCASTS);
        }
        setLoading(false);
      });
  }, []);

  const filtered = podcasts.filter(p =>
    !search.trim() ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.authors?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalMinutes = podcasts.reduce((s, p) => s + (p.duration_minutes ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A1128] via-[#100D2E] to-[#0A1128] border-b border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00F5A0] flex items-center justify-center text-xl">🎙️</div>
            <span className="text-[#9D4EDD] text-sm font-medium uppercase tracking-widest">Podcasts</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            Podcasts &amp; <span className="bg-gradient-to-r from-[#9D4EDD] to-[#00F5A0] bg-clip-text text-transparent">Teaching</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">Faith conversations, gospel culture, worship teaching and creator insights.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-[#9D4EDD]/10 to-[#00F5A0]/10 border border-[#9D4EDD]/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/20 flex items-center justify-center text-xl shrink-0">🚀</div>
          <div>
            <p className="font-semibold text-white text-sm">Creator Podcast Uploads — Coming Soon</p>
            <p className="text-gray-400 text-xs mt-0.5">We're building podcast hosting for creators. Apply for early access.</p>
          </div>
          <button className="ml-auto px-4 py-2 border border-[#9D4EDD]/40 text-[#9D4EDD] rounded-xl text-xs font-medium hover:bg-[#9D4EDD]/10 transition-colors whitespace-nowrap shrink-0">
            Get Early Access
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search podcasts, hosts..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-white/10 rounded w-1/4" />
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎙️</div>
            <p className="text-gray-400 text-lg">No podcasts found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(podcast => (
              <PodcastCard key={podcast.id} podcast={podcast} />
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          {[
            { label: 'Episodes Available', value: String(podcasts.length) },
            { label: 'Total Listen Time', value: `${totalMinutes} min` },
            { label: 'Creator Podcasts', value: 'Coming Soon' },
          ].map(s => (
            <div key={s.label} className="bg-white/3 border border-white/5 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-white mb-1">{s.value}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
