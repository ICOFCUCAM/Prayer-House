import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SUPPORTED_LANGUAGES } from '@/pipelines/translation/LanguageMapping';

// ── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: string;
  title: string;
  cover_art: string | null;
  genre: string | null;
  language: string | null;
  play_count: number;
  audio_url: string | null;
  created_at: string;
  artists?: { name: string; slug: string } | null;
}

const GENRES = ['All', 'Gospel', 'Afrobeats', 'Hip-Hop', 'Classical', 'Jazz', 'R&B', 'Praise', 'Worship'];
const PAGE_SIZE = 24;

const GENRE_GRADIENTS: Record<string, string> = {
  Gospel: 'from-[#9D4EDD]/40 to-[#00D9FF]/20',
  Afrobeats: 'from-[#FF6B00]/40 to-[#FFB800]/20',
  'Hip-Hop': 'from-gray-700/60 to-gray-900/40',
  Classical: 'from-[#FFB800]/30 to-amber-900/20',
  Jazz: 'from-[#00D9FF]/30 to-blue-900/20',
  'R&B': 'from-pink-900/40 to-[#9D4EDD]/20',
  Praise: 'from-[#00F5A0]/20 to-[#9D4EDD]/20',
  Worship: 'from-[#00D9FF]/20 to-indigo-900/20',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Track Card ────────────────────────────────────────────────────────────────

function TrackCard({ track, onPlay }: { track: Track; onPlay: (t: Track) => void }) {
  const genre = track.genre ?? '';
  const gradient = GENRE_GRADIENTS[genre] ?? 'from-[#9D4EDD]/30 to-[#00D9FF]/10';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
      <div className="aspect-square relative overflow-hidden bg-white/5">
        {track.cover_art ? (
          <img
            src={track.cover_art}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
        )}
        {/* Play button overlay */}
        <button
          onClick={() => onPlay(track)}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"
          aria-label={`Play ${track.title}`}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
        {/* Genre badge */}
        {track.genre && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white border border-white/10 font-medium">
              {track.genre}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-white text-sm truncate">{track.title}</p>
        <p className="text-gray-400 text-xs mt-0.5 truncate">
          {track.artists?.name ?? 'Unknown Artist'}
        </p>
        <p className="text-gray-600 text-[10px] mt-1">{fmt(track.play_count ?? 0)} plays</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MusicCollectionPage() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchTracks = async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) { setLoading(true); setPage(0); } else { setLoadingMore(true); }

    let query = supabase
      .from('tracks')
      .select('id, title, cover_art, genre, language, play_count, audio_url, created_at, artists(name, slug)')
      .order('play_count', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (selectedLanguage !== 'all') query = query.eq('language', selectedLanguage);
    if (selectedGenre !== 'All') query = query.eq('genre', selectedGenre);
    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);

    const { data, error } = await query;
    if (!error && data) {
      if (reset) {
        setTracks(data as Track[]);
      } else {
        setTracks(prev => [...prev, ...(data as Track[])]);
      }
      setHasMore(data.length === PAGE_SIZE);
      if (!reset) setPage(p => p + 1);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  // Refetch on filter change
  useEffect(() => {
    fetchTracks(true);
  }, [selectedLanguage, selectedGenre, search]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  const handlePlay = (track: Track) => {
    // Dispatch to GlobalPlayer store or just navigate
    if (track.audio_url) {
      window.dispatchEvent(new CustomEvent('wankong:play', { detail: track }));
    }
  };

  const handleLoadMore = () => {
    setPage(p => { fetchTracks(false); return p; });
  };

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A1128] via-[#100D2E] to-[#0A1128] border-b border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center text-xl">🎵</div>
            <span className="text-[#00D9FF] text-sm font-medium uppercase tracking-widest">Music</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            Explore <span className="bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] bg-clip-text text-transparent">Music</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">Discover gospel, afrobeats, praise &amp; worship and more from creators worldwide.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search songs, artists..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/40"
          />
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedGenre === g
                  ? 'bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Language pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedLanguage('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedLanguage === 'all'
                ? 'bg-[#00D9FF] text-[#0A1128]'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
            }`}
          >
            🌍 All Languages
          </button>
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedLanguage === lang.code
                  ? 'bg-[#00D9FF] text-[#0A1128]'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎵</div>
            <p className="text-gray-400 text-lg">No tracks found.</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your filters or search.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">{tracks.length} tracks</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {tracks.map(track => (
                <TrackCard key={track.id} track={track} onPlay={handlePlay} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading…
                    </span>
                  ) : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
