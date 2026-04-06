import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import { IMAGES, MOCK_COMPETITIONS, MOCK_CREATORS, formatCurrency, formatNumber } from '@/lib/constants';

const HERO_IMAGE = IMAGES.hero;
const ARTIST_IMAGES = IMAGES.creators;

const MUSIC_LANGUAGES = [
  { name: 'Afrobeats', flag: '🇳🇬', count: 1240 },
  { name: 'Bongo Flava', flag: '🇹🇿', count: 890 },
  { name: 'Highlife', flag: '🇬🇭', count: 760 },
  { name: 'Amapiano', flag: '🇿🇦', count: 1100 },
  { name: 'Benga', flag: '🇰🇪', count: 540 },
  { name: 'Mbalax', flag: '🇸🇳', count: 320 },
  { name: 'Afro House', flag: '🌍', count: 980 },
  { name: 'Hip-Hop', flag: '🌎', count: 2400 },
];

const DISTRIBUTION_PLATFORMS = [
  'Spotify', 'Apple Music', 'YouTube Music', 'TikTok', 'Amazon Music',
  'Deezer', 'Tidal', 'Audiomack', 'Boomplay', 'Anghami',
  'SoundCloud', 'Shazam', 'Pandora', 'iHeart Radio', 'Napster',
  'Beatport', 'Traxsource', 'Juno', '7Digital', 'AWA',
  'Gracenote', 'MediaNet', 'Slacker', 'Radionomy', 'Zvuk',
  'NetEase', 'QQ Music', 'Yandex Music', 'KKBOX', 'LINE Music',
];

export default function AppLayout() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<{ id: string; handle: string; title: string }[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [musicProducts, setMusicProducts] = useState<any[]>([]);
  const [bookProducts, setBookProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch collections
        const { data: colData } = await supabase.from('ecom_collections').select('id, handle, title').order('sort_order');
        if (colData) setCollections(colData);

        // Fetch trending products
        const { data: trending } = await supabase
          .from('ecom_products')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8);
        if (trending) setTrendingProducts(trending);

        // Fetch featured
        const { data: featured } = await supabase
          .from('ecom_products')
          .select('*')
          .eq('status', 'active')
          .eq('featured', true)
          .limit(6);
        if (featured) setFeaturedProducts(featured.length ? featured : (trending || []).slice(0, 4));

        // New releases
        const { data: newR } = await supabase
          .from('ecom_products')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6);
        if (newR) setNewReleases(newR);

        // Music products
        const { data: music } = await supabase
          .from('ecom_products')
          .select('*')
          .ilike('product_type', '%music%')
          .eq('status', 'active')
          .limit(6);
        if (music) setMusicProducts(music);

        // Book products
        const { data: books } = await supabase
          .from('ecom_products')
          .select('*')
          .ilike('product_type', '%book%')
          .eq('status', 'active')
          .limit(4);
        if (books) setBookProducts(books);
      } catch (err) {
        console.error('Error fetching homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const navCollections = collections.filter(c =>
    ['music', 'videos', 'books', 'podcasts', 'talent-arena', 'marketplace', 'competitions'].includes(c.handle)
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="Hero" className="w-full h-full object-cover opacity-30" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-medium">🌍 African Creator Platform</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight mb-6">
              Your Music.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Your Story.</span><br />
              The World.
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Distribute your music to 30+ platforms. Sell books, videos & podcasts globally. Compete and win prizes. WANKONG powers African creators worldwide.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
                Start Creating
              </button>
              <button onClick={() => navigate('/collections/music')} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/20">
                Explore Music
              </button>
            </div>
            {/* Stats */}
            <div className="flex flex-wrap gap-6">
              {[
                { label: 'Creators', value: '12K+' },
                { label: 'Platforms', value: '30+' },
                { label: 'Countries', value: '42' },
                { label: 'Paid Out', value: '$2.3M' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Artist collage */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:grid grid-cols-2 gap-2 p-4 opacity-60">
          {ARTIST_IMAGES.slice(0, 6).map((img, i) => (
            <div key={i} className={`relative overflow-hidden rounded-xl ${i === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}>
              <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          ))}
        </div>
      </section>

      {/* Browse by Language */}
      <section className="py-16 px-4 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Browse by Language</h2>
            <p className="text-gray-400 mt-1">Discover music from every African musical tradition</p>
          </div>
          <Link to="/collections/languages" className="text-sm text-indigo-400 hover:text-indigo-300">View all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {MUSIC_LANGUAGES.map(lang => (
            <Link
              key={lang.name}
              to={`/collections/music?language=${encodeURIComponent(lang.name)}`}
              className="group flex flex-col items-center p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-indigo-500/30 hover:bg-gray-900 transition-all"
            >
              <span className="text-2xl mb-2">{lang.flag}</span>
              <span className="text-xs font-medium text-white text-center">{lang.name}</span>
              <span className="text-[10px] text-gray-500 mt-0.5">{formatNumber(lang.count)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Play Music */}
      {(musicProducts.length > 0 || !loading) && (
        <section className="py-8 px-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Quick Play</h2>
            <Link to="/collections/music" className="text-sm text-indigo-400 hover:text-indigo-300">Browse all music →</Link>
          </div>
          {musicProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {musicProducts.map(p => (
                <ProductCard key={p.id} product={{ ...p, image: p.images?.[0] || p.cover_art, price: p.variants?.[0]?.price || p.price, language: p.language }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {IMAGES.albums.map((img, i) => (
                <Link key={i} to="/collections/music" className="group block bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all">
                  <div className="aspect-square overflow-hidden"><img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                  <div className="p-2"><p className="text-xs text-gray-400">Music Track {i + 1}</p></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending Now */}
      <section className="py-16 px-4 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Trending Now</h2>
            <p className="text-gray-400 mt-1">Most popular content this week</p>
          </div>
          <Link to="/collections/marketplace" className="text-sm text-indigo-400 hover:text-indigo-300">View all →</Link>
        </div>
        {trendingProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {trendingProducts.slice(0, 8).map(p => (
              <ProductCard key={p.id} product={{ ...p, image: p.images?.[0] || p.cover_art, price: p.variants?.[0]?.price || p.price }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...IMAGES.albums, ...IMAGES.thumbnails].slice(0, 8).map((img, i) => (
              <Link key={i} to="/collections/marketplace" className="group block bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all">
                <div className="aspect-square overflow-hidden"><img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                <div className="p-3">
                  <p className="text-sm font-medium text-white truncate">Content Item {i + 1}</p>
                  <p className="text-xs text-gray-400">Various Artists</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Books */}
      <section className="py-16 px-4 lg:px-8 bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Featured Books</h2>
              <p className="text-gray-400 mt-1">Literature from African & global authors</p>
            </div>
            <Link to="/collections/books" className="text-sm text-indigo-400 hover:text-indigo-300">Browse library →</Link>
          </div>
          {bookProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {bookProducts.map(p => (
                <ProductCard key={p.id} product={{ ...p, image: p.images?.[0] || p.cover_art, price: p.variants?.[0]?.price || p.price }} variant="featured" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {IMAGES.albums.slice(0, 4).map((img, i) => (
                <Link key={i} to="/collections/books" className="group relative block rounded-2xl overflow-hidden aspect-[3/4] bg-gray-900">
                  <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[10px] text-white bg-amber-500/80 px-2 py-0.5 rounded-full">Book</span>
                    <p className="text-white font-semibold mt-1 text-sm">Story {i + 1}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Artists */}
      <section className="py-16 px-4 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Trending Artists</h2>
            <p className="text-gray-400 mt-1">Top creators on the platform</p>
          </div>
          <Link to="/collections/artists" className="text-sm text-indigo-400 hover:text-indigo-300">See all artists →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {MOCK_CREATORS.map(creator => (
            <Link key={creator.id} to={`/artist/${creator.id}`} className="group flex flex-col items-center text-center p-3 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-indigo-500/30 transition-all">
              <img src={creator.avatar} alt={creator.name} className="w-14 h-14 rounded-full object-cover mb-2 ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all" onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${creator.name}`; }} />
              <p className="text-xs font-medium text-white truncate w-full">{creator.name}</p>
              <p className="text-[10px] text-gray-400">{creator.category}</p>
              <p className="text-[10px] text-indigo-400 mt-0.5">{formatNumber(creator.followers)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Competitions Highlight */}
      <section className="py-16 px-4 lg:px-8 bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Active Competitions</h2>
              <p className="text-gray-400 mt-1">Compete, get AI scored, win prizes</p>
            </div>
            <Link to="/collections/competitions" className="text-sm text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_COMPETITIONS.filter(c => c.status === 'active').slice(0, 3).map(comp => (
              <Link key={comp.id} to="/collections/competitions" className="group relative block rounded-2xl overflow-hidden h-48 bg-gray-900">
                <img src={comp.banner} alt={comp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-emerald-500/80 text-white text-xs rounded-full font-medium">Active</span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white font-bold">{comp.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-emerald-400 font-semibold">{formatCurrency(comp.prizePool)} prize</span>
                    <span className="text-xs text-gray-300">{comp.entries} entries</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Content */}
      {featuredProducts.length > 0 && (
        <section className="py-16 px-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Featured Content</h2>
            <Link to="/collections/marketplace" className="text-sm text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredProducts.map(p => (
              <ProductCard key={p.id} product={{ ...p, image: p.images?.[0] || p.cover_art, price: p.variants?.[0]?.price || p.price }} variant="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Talent Arena CTA */}
      <section className="py-20 px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-6">
            <span className="text-lg">🏆</span>
            <span className="text-purple-400 text-sm font-medium">Talent Arena</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Compete & Win</h2>
          <p className="text-gray-400 mb-8 text-lg">AI-powered competitions with cash prizes. Weekly, monthly, and special events for music, video, and more.</p>
          <Link to="/collections/talent-arena" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all">
            Enter Talent Arena
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </div>
      </section>

      {/* Distribution platforms */}
      <section className="py-16 px-4 lg:px-8 bg-gray-900/30">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Distribute to 30+ Platforms</h2>
          <p className="text-gray-400 mb-10">Your music everywhere your fans are</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {DISTRIBUTION_PLATFORMS.map(platform => (
              <span key={platform} className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg">
                {platform}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Creator CTA */}
      <section className="py-20 px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-2xl p-10 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Creating?</h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto">Join 12,000+ creators earning from their music, books, videos and more. Get paid worldwide through Stripe, M-Pesa, MTN MoMo and more.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/dashboard" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
                Create Your Account
              </Link>
              <Link to="/collections/marketplace" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors border border-white/20">
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
