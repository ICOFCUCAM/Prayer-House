import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';

// ── Types ──────────────────────────────────────────────────────────────────────

type ContentType = 'all' | 'music' | 'podcast' | 'book' | 'audiobook' | 'video';
type SortOption  = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'free';

interface FilterState {
  type:   ContentType;
  sort:   SortOption;
  lang:   string;
  free:   boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_FILTERS: { label: string; value: ContentType; icon: string }[] = [
  { label: 'All',        value: 'all',       icon: '🔍' },
  { label: 'Music',      value: 'music',     icon: '🎵' },
  { label: 'Podcast',    value: 'podcast',   icon: '🎙️' },
  { label: 'Book',       value: 'book',      icon: '📖' },
  { label: 'Audiobook',  value: 'audiobook', icon: '🎧' },
  { label: 'Video',      value: 'video',     icon: '🎬' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Best Match',     value: 'relevance'  },
  { label: 'Newest',         value: 'newest'     },
  { label: 'Price: Low→High',value: 'price_asc'  },
  { label: 'Price: High→Low',value: 'price_desc' },
  { label: 'Free Only',      value: 'free'       },
];

const RECENT_KEY = 'wk_recent_searches';

function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveSearch(q: string) {
  const prev = getRecentSearches();
  const updated = [q, ...prev.filter(s => s !== q)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const q               = searchParams.get('q') || '';
  const inputRef        = useRef<HTMLInputElement>(null);

  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [query,    setQuery]    = useState(q);
  const [filters,  setFilters]  = useState<FilterState>({ type: 'all', sort: 'relevance', lang: '', free: false });
  const [recent,   setRecent]   = useState<string[]>(() => getRecentSearches());
  const [showSugg, setShowSugg] = useState(false);

  // Run search whenever q or filters change
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    saveSearch(q);
    setRecent(getRecentSearches());
    setLoading(true);

    let qb = supabase
      .from('ecom_products')
      .select('*')
      .or(`title.ilike.%${q}%,body_html.ilike.%${q}%,vendor.ilike.%${q}%,product_type.ilike.%${q}%,artist.ilike.%${q}%,author.ilike.%${q}%`)
      .eq('status', 'active');

    // Type filter
    if (filters.type !== 'all') {
      qb = qb.ilike('product_type', `${filters.type}%`);
    }

    // Free filter
    if (filters.sort === 'free') {
      qb = qb.or('price.is.null,price.eq.0');
    }

    // Language filter
    if (filters.lang) {
      qb = qb.ilike('language', `%${filters.lang}%`);
    }

    // Sort
    if (filters.sort === 'newest') {
      qb = qb.order('created_at', { ascending: false });
    } else if (filters.sort === 'price_asc') {
      qb = qb.order('price', { ascending: true });
    } else if (filters.sort === 'price_desc') {
      qb = qb.order('price', { ascending: false });
    }

    qb.limit(48).then(({ data }) => {
      setResults(data || []);
      setLoading(false);
    });
  }, [q, filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setShowSugg(false);
    }
  };

  const doSearch = (term: string) => {
    setQuery(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setShowSugg(false);
  };

  const setType = (t: ContentType) => setFilters(f => ({ ...f, type: t }));
  const setSort = (s: SortOption)   => setFilters(f => ({ ...f, sort: s }));

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">

        {/* Search input */}
        <form onSubmit={handleSearch} className="relative mb-8">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="Search music, books, podcasts, artists..."
              className="w-full bg-[#0D1635] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40 text-lg"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Recent searches dropdown */}
          {showSugg && !q && recent.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D1635] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <span className="text-white/40 text-xs uppercase tracking-widest">Recent Searches</span>
                <button type="button" onClick={() => { clearRecentSearches(); setRecent([]); }}
                  className="text-white/30 hover:text-white text-xs transition-colors">
                  Clear all
                </button>
              </div>
              {recent.map(s => (
                <button key={s} type="button" onClick={() => doSearch(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                  <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-300 text-sm">{s}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Type pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: 'none' }}>
            {TYPE_FILTERS.map(f => (
              <button key={f.value} onClick={() => setType(f.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  filters.type === f.value
                    ? 'bg-[#00D9FF] text-[#0A1128]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}>
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={filters.sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="bg-[#0D1635] border border-white/10 text-white text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/30 cursor-pointer shrink-0"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Header */}
        {q && (
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">
              {loading ? 'Searching…' : `Results for "${q}"`}
            </h1>
            {!loading && (
              <p className="text-gray-500 text-sm mt-0.5">
                {results.length} {results.length === 1 ? 'result' : 'results'}
                {filters.type !== 'all' && ` · ${TYPE_FILTERS.find(t => t.value === filters.type)?.label}`}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {results.map(p => (
              <ProductCard
                key={p.id}
                product={{ ...p, image: p.images?.[0] || p.cover_art, price: p.variants?.[0]?.price ?? p.price }}
                variant="square"
              />
            ))}
          </div>
        ) : q ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-white text-lg font-semibold mb-1">No results found</p>
            <p className="text-gray-500 text-sm mb-4">
              No {filters.type !== 'all' ? filters.type + 's' : 'content'} matching "{q}"
            </p>
            {filters.type !== 'all' && (
              <button onClick={() => setType('all')}
                className="inline-block px-5 py-2 bg-[#00D9FF]/10 border border-[#00D9FF]/20 text-[#00D9FF] rounded-xl text-sm hover:bg-[#00D9FF]/20 transition-colors">
                Search all content types
              </button>
            )}
          </div>
        ) : (
          /* Empty state — show recent searches */
          <div className="py-16 text-center">
            <p className="text-white font-semibold mb-6">Discover something new</p>
            {recent.length > 0 && (
              <div className="mb-8">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Recent</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {recent.map(s => (
                    <button key={s} onClick={() => doSearch(s)}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {['Gospel Music', 'Afrobeats', 'Audiobooks', 'Pidgin Podcasts', 'Worship'].map(s => (
                <button key={s} onClick={() => doSearch(s)}
                  className="px-4 py-2 bg-[#00D9FF]/5 border border-[#00D9FF]/15 rounded-full text-sm text-[#00D9FF]/70 hover:text-[#00D9FF] hover:bg-[#00D9FF]/10 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
