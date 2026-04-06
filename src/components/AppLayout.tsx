import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import { Play, Zap, Music, BookOpen, Video, Mic, Trophy, Globe, Users, DollarSign, TrendingUp, ArrowRight, Headphones, Radio, Star, ChevronRight } from 'lucide-react';

const HERO_IMAGE = 'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047590438_0a152d8a.png';

const ARTIST_IMAGES = [
  'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047821550_5abc0a11.png',
  'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047791621_1ee31d4b.jpg',
  'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047793741_84240e78.jpg',
  'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047794965_c692c0d2.jpg',
];

const DISTRIBUTION_PLATFORMS = [
  'Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'TikTok', 'Instagram',
  'Deezer', 'Tidal', 'Boomplay', 'Audiomack', 'Anghami', 'JioSaavn',
  'Pandora', 'iHeartRadio', 'SoundCloud', 'Bandcamp', 'Beatport', 'Qobuz',
  'KKBOX', 'Gaana', 'Napster', 'Tencent Music', 'NetEase', 'Traxsource',
  'Facebook Music', 'Snapchat Sounds', 'Shazam', 'Ditto', 'Resso'
];

const STATS = [
  { icon: Users, label: 'Active Creators', value: '12,500+', color: '#00D9FF' },
  { icon: Globe, label: 'Countries', value: '140+', color: '#9D4EDD' },
  { icon: DollarSign, label: 'Creator Payouts', value: '$2.8M+', color: '#00F5A0' },
  { icon: TrendingUp, label: 'Monthly Streams', value: '45M+', color: '#FFB800' },
];

export default function AppLayout() {
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: cols } = await supabase
        .from('ecom_collections')
        .select('*')
        .eq('is_visible', true);
      if (cols) setCollections(cols);

      const trendingCol = cols?.find(c => c.handle === 'trending');
      if (trendingCol) {
        const { data: links } = await supabase
          .from('ecom_product_collections')
          .select('product_id, position')
          .eq('collection_id', trendingCol.id)
          .order('position');
        if (links && links.length > 0) {
          const ids = links.map(l => l.product_id);
          const { data: prods } = await supabase
            .from('ecom_products')
            .select('*, variants:ecom_product_variants(*)')
            .in('id', ids)
            .eq('status', 'active');
          const sorted = ids.map(id => prods?.find(p => p.id === id)).filter(Boolean);
          setTrendingProducts(sorted);
        }
      }

      const featuredCol = cols?.find(c => c.handle === 'featured');
      if (featuredCol) {
        const { data: links } = await supabase
          .from('ecom_product_collections')
          .select('product_id, position')
          .eq('collection_id', featuredCol.id)
          .order('position');
        if (links && links.length > 0) {
          const ids = links.map(l => l.product_id);
          const { data: prods } = await supabase
            .from('ecom_products')
            .select('*, variants:ecom_product_variants(*)')
            .in('id', ids)
            .eq('status', 'active');
          const sorted = ids.map(id => prods?.find(p => p.id === id)).filter(Boolean);
          setFeaturedProducts(sorted);
        }
      }

      const newCol = cols?.find(c => c.handle === 'new-releases');
      if (newCol) {
        const { data: links } = await supabase
          .from('ecom_product_collections')
          .select('product_id, position')
          .eq('collection_id', newCol.id)
          .order('position');
        if (links && links.length > 0) {
          const ids = links.map(l => l.product_id);
          const { data: prods } = await supabase
            .from('ecom_products')
            .select('*, variants:ecom_product_variants(*)')
            .in('id', ids)
            .eq('status', 'active');
          const sorted = ids.map(id => prods?.find(p => p.id === id)).filter(Boolean);
          setNewReleases(sorted);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const contentCollections = collections.filter(c => ['music', 'videos', 'books', 'podcasts'].includes(c.handle));

  const getCollectionIcon = (handle: string) => {
    switch (handle) {
      case 'music': return <Music className="w-8 h-8" />;
      case 'videos': return <Video className="w-8 h-8" />;
      case 'books': return <BookOpen className="w-8 h-8" />;
      case 'podcasts': return <Mic className="w-8 h-8" />;
      default: return <Zap className="w-8 h-8" />;
    }
  };

  const getCollectionGradient = (handle: string) => {
    switch (handle) {
      case 'music': return 'from-[#9D4EDD] to-[#00D9FF]';
      case 'videos': return 'from-[#00D9FF] to-[#00F5A0]';
      case 'books': return 'from-[#FFB800] to-[#FF6B00]';
      case 'podcasts': return 'from-[#FF006E] to-[#9D4EDD]';
      default: return 'from-[#00D9FF] to-[#9D4EDD]';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="WANKONG" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A1128]/60 via-[#0A1128]/80 to-[#0A1128]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1128] via-transparent to-[#0A1128]/80" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-full mb-6">
              <div className="w-2 h-2 bg-[#00F5A0] rounded-full animate-pulse" />
              <span className="text-[#FFB800] text-sm font-medium">Talent Arena Week 12 — Voting Now Live</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
              Create. Distribute.
              <br />
              <span className="bg-gradient-to-r from-[#00D9FF] via-[#9D4EDD] to-[#FFB800] bg-clip-text text-transparent">
                Get Paid.
              </span>
            </h1>
            <p className="text-xl text-white/60 mb-8 max-w-xl">
              The global creator economy platform. Upload music, videos, books & podcasts. Distribute to 30+ streaming outlets. Compete in the Talent Arena. Earn royalties worldwide.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/collections/featured')}
                className="px-8 py-4 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Creating
              </button>
              <button
                onClick={() => navigate('/collections/talent-arena')}
                className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <Trophy className="w-5 h-5 text-[#FFB800]" />
                Talent Arena
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 text-center hover:bg-white/10 transition-all">
                <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
                <p className="text-2xl md:text-3xl font-black text-white">{stat.value}</p>
                <p className="text-white/40 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Categories */}
      {contentCollections.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Browse Content</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {contentCollections.map(col => (
                <Link
                  key={col.id}
                  to={`/collections/${col.handle}`}
                  className={`group relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br ${getCollectionGradient(col.handle)} hover:scale-[1.02] transition-all duration-300`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="text-white/80 mb-3">{getCollectionIcon(col.handle)}</div>
                    <h3 className="text-white font-bold text-xl mb-1">{col.title}</h3>
                    <p className="text-white/60 text-sm line-clamp-2">{col.description}</p>
                    <div className="mt-4 flex items-center gap-1 text-white/80 text-sm font-medium">
                      Explore <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fallback Browse Content when no collections */}
      {contentCollections.length === 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-white mb-8">Browse Content</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { handle: 'music', title: 'Music', description: 'Tracks, EPs & Albums' },
                { handle: 'videos', title: 'Videos', description: 'Films & Vlogs' },
                { handle: 'books', title: 'Books', description: 'eBooks & Literature' },
                { handle: 'podcasts', title: 'Podcasts', description: 'Shows & Interviews' },
              ].map(col => (
                <Link
                  key={col.handle}
                  to={`/collections/${col.handle}`}
                  className={`group relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br ${getCollectionGradient(col.handle)} hover:scale-[1.02] transition-all duration-300`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative">
                    <div className="text-white/80 mb-3">{getCollectionIcon(col.handle)}</div>
                    <h3 className="text-white font-bold text-xl mb-1">{col.title}</h3>
                    <p className="text-white/60 text-sm">{col.description}</p>
                    <div className="mt-4 flex items-center gap-1 text-white/80 text-sm font-medium">
                      Explore <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending Now */}
      {trendingProducts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFB800]/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#FFB800]" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Trending Now</h2>
                  <p className="text-white/40 text-sm">What's hot on WANKONG this week</p>
                </div>
              </div>
              <Link to="/collections/trending" className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-sm font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {trendingProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Content */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#9D4EDD]/20 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-[#9D4EDD]" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Featured</h2>
                  <p className="text-white/40 text-sm">Hand-picked by the WANKONG team</p>
                </div>
              </div>
              <Link to="/collections/featured" className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-sm font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.slice(0, 3).map(product => (
                <ProductCard key={product.id} product={product} variant="featured" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Talent Arena CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#9D4EDD]/30 via-[#0A1128] to-[#FFB800]/30 border border-white/10 p-8 md:p-12">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFB800]/5 rounded-full -translate-y-48 translate-x-48" />
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFB800]/20 border border-[#FFB800]/30 rounded-full mb-4">
                  <Trophy className="w-4 h-4 text-[#FFB800]" />
                  <span className="text-[#FFB800] text-sm font-semibold">Talent Arena</span>
                </div>
                <h2 className="text-4xl font-black text-white mb-4">
                  Compete. Win. <span className="text-[#FFB800]">Get Discovered.</span>
                </h2>
                <p className="text-white/60 mb-6">
                  Upload your performance, get AI-scored, receive public votes, and compete for cash prizes and global exposure. Weekly winners get featured on our homepage and auto-published to social media.
                </p>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <div className="w-2 h-2 bg-[#00F5A0] rounded-full" />
                    AI Vocal Analysis
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <div className="w-2 h-2 bg-[#00D9FF] rounded-full" />
                    Public Voting
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <div className="w-2 h-2 bg-[#FFB800] rounded-full" />
                    Cash Prizes
                  </div>
                </div>
                <button
                  onClick={() => navigate('/collections/talent-arena')}
                  className="px-8 py-4 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-[#0A1128] font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  Enter Competition
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ARTIST_IMAGES.map((img, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-[3/4]">
                    <img src={img} alt={`Artist ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128]/80 to-transparent" />
                    {i === 0 && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-[#FFB800] text-[#0A1128] text-xs font-bold rounded-full">
                        Week 12 Winner
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Releases */}
      {newReleases.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00F5A0]/20 rounded-xl flex items-center justify-center">
                  <Radio className="w-5 h-5 text-[#00F5A0]" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">New Releases</h2>
                  <p className="text-white/40 text-sm">Fresh content just dropped</p>
                </div>
              </div>
              <Link to="/collections/new-releases" className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-sm font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {newReleases.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Distribution Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-full mb-4">
              <Headphones className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-[#00D9FF] text-sm font-semibold">Music Distribution</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-4">
              Distribute to <span className="text-[#00D9FF]">30+ Platforms</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Upload once, distribute everywhere. Your music on Spotify, Apple Music, TikTok, and 27+ more platforms. Track royalties in real-time.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {DISTRIBUTION_PLATFORMS.map((platform, i) => (
              <div
                key={i}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white/50 text-sm hover:bg-white/10 hover:text-white hover:border-[#00D9FF]/30 transition-all cursor-default"
              >
                {platform}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creator CTA */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#00D9FF]/10 to-[#9D4EDD]/10 border border-white/10 p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00aDJ2MmgtMnYtMnptLTQgMHYyaC0ydi0yaDJ6bTIgMGgydjJoLTJ2LTJ6bS0yLTRoMnYyaC0ydi0yem0yIDBoMnYyaC0ydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                Ready to <span className="bg-gradient-to-r from-[#00D9FF] to-[#FFB800] bg-clip-text text-transparent">Monetize</span> Your Creativity?
              </h2>
              <p className="text-white/50 text-lg mb-8 max-w-2xl mx-auto">
                Join 12,500+ creators earning from their content. Upload books, music, videos, and podcasts. Get paid through Stripe or Mobile Money.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => navigate('/collections/featured')}
                  className="px-8 py-4 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-all transform hover:scale-105"
                >
                  Explore Content
                </button>
                <button
                  onClick={() => navigate('/collections/music')}
                  className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all"
                >
                  Browse Music
                </button>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/30 text-sm">
                <span>70% Creator Revenue</span>
                <span>|</span>
                <span>Instant Digital Delivery</span>
                <span>|</span>
                <span>Global Payouts</span>
                <span>|</span>
                <span>Mobile Money Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
