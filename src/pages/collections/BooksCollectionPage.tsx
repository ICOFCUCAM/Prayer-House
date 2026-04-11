import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SUPPORTED_LANGUAGES } from '@/pipelines/translation/LanguageMapping';

// ── Types ────────────────────────────────────────────────────────────────────

interface Book {
  id: string;
  title: string;
  cover_url: string | null;
  price: number;
  product_type: string;
  genre: string | null;
  language: string | null;
  status: string;
  created_at: string;
  authors?: { name: string } | null;
}

const BOOK_GENRES = ['All', 'Fiction', 'Non-Fiction', 'Christian Living', 'Theology', 'Biography', 'Children', 'Poetry', 'Self-Help', 'History'];
type PriceFilter = 'all' | 'free' | 'paid';

const PAGE_SIZE = 24;

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Book Card ─────────────────────────────────────────────────────────────────

function BookCard({ book, onDownload }: { book: Book; onDownload: (b: Book) => void }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group flex flex-col">
      <div className="aspect-[3/4] relative overflow-hidden bg-white/5">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/10 flex flex-col items-center justify-center gap-2">
            <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        {/* Price badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${book.price === 0 ? 'bg-[#00F5A0] text-[#0A1128]' : 'bg-[#FFB800] text-[#0A1128]'}`}>
            {book.price === 0 ? 'FREE' : `$${book.price.toFixed(2)}`}
          </span>
        </div>
        {book.genre && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white border border-white/10 font-medium">
              {book.genre}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-semibold text-white text-sm line-clamp-2 flex-1">{book.title}</p>
        <p className="text-gray-400 text-xs mt-1 truncate">{book.authors?.name ?? 'Unknown Author'}</p>
        <button
          onClick={() => onDownload(book)}
          className="mt-3 w-full py-2 rounded-xl text-xs font-medium transition-all bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white hover:opacity-90"
        >
          {book.price === 0 ? 'Download Free' : 'Buy Now'}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BooksCollectionPage() {
  const navigate = useNavigate();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchBooks = async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) { setLoading(true); setPage(0); } else { setLoadingMore(true); }

    let query = supabase
      .from('ecom_products')
      .select('id, title, cover_url, price, product_type, genre, language, status, created_at, authors(name)')
      .eq('product_type', 'Book')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (selectedGenre !== 'All') query = query.eq('genre', selectedGenre);
    if (selectedLanguage !== 'all') query = query.eq('language', selectedLanguage);
    if (priceFilter === 'free') query = query.eq('price', 0);
    if (priceFilter === 'paid') query = query.gt('price', 0);
    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);

    const { data, error } = await query;
    if (!error && data) {
      if (reset) {
        setBooks(data as Book[]);
      } else {
        setBooks(prev => [...prev, ...(data as Book[])]);
      }
      setHasMore(data.length === PAGE_SIZE);
      if (!reset) setPage(p => p + 1);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchBooks(true);
  }, [selectedGenre, selectedLanguage, priceFilter, search]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 400);
  };

  const handleDownload = (book: Book) => {
    if (book.price === 0) {
      navigate(`/products/${book.id}`);
    } else {
      navigate(`/products/${book.id}`);
    }
  };

  const PRICE_OPTIONS: { id: PriceFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'free', label: 'Free' },
    { id: 'paid', label: 'Paid' },
  ];

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A1128] via-[#100D2E] to-[#0A1128] border-b border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#FFB800] flex items-center justify-center text-xl">📚</div>
            <span className="text-[#9D4EDD] text-sm font-medium uppercase tracking-widest">Books</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            Explore <span className="bg-gradient-to-r from-[#9D4EDD] to-[#FFB800] bg-clip-text text-transparent">Books</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">Discover African literature, Christian books, poetry and more from authors worldwide.</p>
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
            placeholder="Search books, authors..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/40"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Price filter */}
          <div className="flex gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
            {PRICE_OPTIONS.map(p => (
              <button
                key={p.id}
                onClick={() => setPriceFilter(p.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  priceFilter === p.id ? 'bg-[#9D4EDD] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Language select */}
          <select
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#9D4EDD]/40"
          >
            <option value="all">All Languages</option>
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
            ))}
          </select>
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {BOOK_GENRES.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedGenre === g
                  ? 'bg-gradient-to-r from-[#9D4EDD] to-[#FFB800] text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                  <div className="h-7 bg-white/10 rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-400 text-lg">No books found.</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">{books.length} books</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {books.map(book => (
                <BookCard key={book.id} book={book} onDownload={handleDownload} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={() => fetchBooks(false)}
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
