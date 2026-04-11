import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import { Play, Zap, Music, BookOpen, Video, Mic, Trophy, Globe, Users, DollarSign, TrendingUp, ArrowRight, Headphones, Radio, Star, ChevronRight, ChevronLeft, Clock } from 'lucide-react';
import { usePlayer } from './GlobalPlayer';
import FeaturedPerformancesGrid from './home/FeaturedPerformancesGrid';

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

// Fallback books shown when Supabase books collection is empty
const MOCK_BOOKS = [
  { id: 'b1', title: 'The Gospel of Grace', author: 'Pastor E. Ofori', price: '$12.99', rating: 5, genre: 'Christian Living', emoji: '✝️', gradient: 'from-[#9D4EDD] to-[#4A1878]', bestseller: true },
  { id: 'b2', title: 'Kingdom Business Secrets', author: 'Dr. Faith Mensah', price: '$18.99', rating: 4, genre: 'Business', emoji: '👑', gradient: 'from-[#FFB800] to-[#B87000]', bestseller: false },
  { id: 'b3', title: 'Midnight Prayers', author: 'Rev. Samuel Asante', price: '$9.99', rating: 5, genre: 'Devotional', emoji: '🌙', gradient: 'from-[#00D9FF] to-[#005C6B]', bestseller: true },
  { id: 'b4', title: 'African Praise Anthology', author: 'Various Authors', price: '$24.99', rating: 4, genre: 'Worship', emoji: '🎵', gradient: 'from-[#FF6B00] to-[#6B2D00]', bestseller: false },
  { id: 'b5', title: 'The Prophetic Voice', author: 'Apostle Grace Oduya', price: '$15.99', rating: 5, genre: 'Prophecy', emoji: '🔥', gradient: 'from-[#FF006E] to-[#6B002E]', bestseller: false },
  { id: 'b6', title: 'Healing in His Wings', author: 'Dr. Emmanuel Yaw', price: '$13.99', rating: 4, genre: 'Healing', emoji: '🕊️', gradient: 'from-[#00F5A0] to-[#006640]', bestseller: true },
  { id: 'b7', title: 'The Digital Christian', author: 'Tech Pastor Kwame', price: '$11.99', rating: 4, genre: 'Technology', emoji: '💻', gradient: 'from-[#00D9FF] to-[#9D4EDD]', bestseller: false },
  { id: 'b8', title: 'Songs of Ascent', author: 'Choir Master David', price: '$8.99', rating: 5, genre: 'Worship', emoji: '🎼', gradient: 'from-[#9D4EDD] to-[#FF006E]', bestseller: false },
  { id: 'b9', title: 'Raising Kingdom Kids', author: 'Pastor Mary Adofo', price: '$16.99', rating: 4, genre: 'Parenting', emoji: '👨‍👩‍👧', gradient: 'from-[#FFB800] to-[#FF6B00]', bestseller: false },
  { id: 'b10', title: 'The Fast That Breaks Chains', author: 'Bishop John Asare', price: '$10.99', rating: 5, genre: 'Fasting & Prayer', emoji: '⚡', gradient: 'from-[#00F5A0] to-[#00D9FF]', bestseller: false },
];

export default function AppLayout() {
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Video player state
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Audio player state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(32); // start mid-track for realism
  const [audioTick, setAudioTick] = useState<ReturnType<typeof setInterval> | null>(null);

  // Live vote counter (Supabase realtime feeds this)
  const [liveVotes, setLiveVotes] = useState(11612);

  const navigate = useNavigate();
  const { recentlyPlayed, play: playerPlay } = usePlayer();
  const booksScrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const [viewCount, setViewCount] = useState(60318);
  const [confetti, setConfetti] = useState(false);
  const [tracksDistributed, setTracksDistributed] = useState(1247);

  // Auto-play video when scrolled into view
  useEffect(() => {
    if (!videoWrapRef.current || !videoRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        videoRef.current?.play().catch(() => {});
        setVideoPlaying(true);
      } else {
        videoRef.current?.pause();
        setVideoPlaying(false);
      }
    }, { threshold: 0.5 });
    obs.observe(videoWrapRef.current);
    return () => obs.disconnect();
  }, []);

  // Animate view count every 4s
  useEffect(() => {
    const id = setInterval(() => setViewCount(v => v + Math.floor(Math.random() * 4 + 1)), 4000);
    return () => clearInterval(id);
  }, []);

  // Animate tracks distributed counter
  useEffect(() => {
    const id = setInterval(() => setTracksDistributed(v => v + 1), 6000);
    return () => clearInterval(id);
  }, []);

  // Confetti burst on mount for winner card
  useEffect(() => {
    const id = setTimeout(() => setConfetti(true), 800);
    return () => clearTimeout(id);
  }, []);

  const scrollBooks = (dir: 'left' | 'right') => {
    if (!booksScrollRef.current) return;
    booksScrollRef.current.scrollBy({ left: dir === 'right' ? 600 : -600, behavior: 'smooth' });
  };

  const toggleAudio = () => {
    if (audioPlaying) {
      if (audioTick) clearInterval(audioTick);
      setAudioTick(null);
      setAudioPlaying(false);
    } else {
      setAudioPlaying(true);
      const id = setInterval(() => {
        setAudioProgress(p => {
          if (p >= 100) { clearInterval(id); setAudioPlaying(false); return 0; }
          return p + 0.4;
        });
      }, 200);
      setAudioTick(id);
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoPlaying) { videoRef.current.pause(); setVideoPlaying(false); }
    else { videoRef.current.play().catch(() => {}); setVideoPlaying(true); }
  };

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

      // Books — try 'books' collection, fall back to type filter
      const booksCol = cols?.find((c: any) => c.handle === 'books');
      if (booksCol) {
        const { data: bLinks } = await supabase
          .from('ecom_product_collections')
          .select('product_id, position')
          .eq('collection_id', booksCol.id)
          .order('position')
          .limit(12);
        if (bLinks && bLinks.length > 0) {
          const ids = bLinks.map((l: any) => l.product_id);
          const { data: bProds } = await supabase
            .from('ecom_products')
            .select('*, variants:ecom_product_variants(*)')
            .in('id', ids)
            .eq('status', 'active');
          const sorted = ids.map((id: string) => bProds?.find((p: any) => p.id === id)).filter(Boolean);
          if (sorted.length > 0) setTrendingBooks(sorted);
        }
      }

      setLoading(false);
    };
    fetchData();

    // Realtime: live vote counter for Talent Winner card
    const voteChannel = supabase
      .channel('homepage-votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'competition_votes' }, () => {
        setLiveVotes(v => v + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(voteChannel); };
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
    <div className="min-h-screen bg-[#0A1128] pb-20">
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

      {/* ── Music by Language — Expanded Compact Version ─────────────────────── */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(157,78,221,0.05),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-full text-[#9D4EDD] text-xs font-medium mb-3">
              <Globe className="w-3 h-3" /> Music by Language
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              Free Gospel Music in Your Language
            </h2>
            <p className="text-white/40 text-sm">Discover Music across cultures worldwide 🌍</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-5">
            {[
              { lang: 'English',    flag: '🇬🇧' },
              { lang: 'French',     flag: '🇫🇷' },
              { lang: 'Spanish',    flag: '🇪🇸' },
              { lang: 'Arabic',     flag: '🇸🇦' },
              { lang: 'Pidgin',     flag: '🌍'  },
              { lang: 'Nigerian',   flag: '🇳🇬' },
              { lang: 'Swahili',    flag: '🇰🇪' },
              { lang: 'German',     flag: '🇩🇪' },
              { lang: 'Norwegian',  flag: '🇳🇴' },
              { lang: 'Swedish',    flag: '🇸🇪' },
              { lang: 'Portuguese', flag: '🇧🇷' },
              { lang: 'Russian',    flag: '🇷🇺' },
              { lang: 'Chinese',    flag: '🇨🇳' },
              { lang: 'Japanese',   flag: '🇯🇵' },
              { lang: 'Yoruba',     flag: '🌍'  },
              { lang: 'Zulu',       flag: '🌍'  },
              { lang: 'Luganda',    flag: '🌍'  },
              { lang: 'Bamumbu',    flag: '🌍'  },
              { lang: 'Bameleke',   flag: '🌍'  },
            ].map(({ lang, flag }) => (
              <Link
                key={lang}
                to={`/collections/music?lang=${lang.toLowerCase()}`}
                className="group flex items-center justify-between gap-2 bg-white/5 border border-white/10 hover:border-[#9D4EDD]/40 hover:bg-[#9D4EDD]/5 rounded-lg px-3 py-2 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{flag}</span>
                  <span className="text-white text-xs font-semibold truncate">{lang}</span>
                </div>
                <span className="text-[9px] font-bold uppercase text-[#00F5A0] bg-[#00F5A0]/10 border border-[#00F5A0]/20 px-1.5 py-0.5 rounded shrink-0">
                  Play / Download
                </span>
              </Link>
            ))}

            <Link
              to="/collections/music"
              className="group flex items-center justify-between gap-2 bg-gradient-to-br from-[#9D4EDD]/20 to-[#00D9FF]/10 border border-[#9D4EDD]/30 hover:border-[#9D4EDD]/60 rounded-lg px-3 py-2 transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <span className="text-white text-xs font-semibold">All Languages</span>
              </div>
              <ChevronRight className="w-3 h-3 text-[#9D4EDD]" />
            </Link>
          </div>

          <div className="text-center">
            <Link
              to="/collections/music"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-all"
            >
              Browse Free Music <ArrowRight className="w-4 h-4" />
            </Link>
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

      {/* ── Trending Now — Compact Creator Dashboard ─────────────────────── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
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

          {/* Compact 4-card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* CARD 1 — Featured Release */}
            <div className="bg-[#0D1635] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/5">
                <Play className="w-4 h-4 text-[#FF6B00]" />
                <span className="text-white text-xs font-semibold">Featured Global Release</span>
              </div>
              <div ref={videoWrapRef} className="relative bg-black cursor-pointer aspect-video max-h-[160px]" onClick={toggleVideo}>
                <video ref={videoRef} className="w-full h-full object-cover" poster={ARTIST_IMAGES[1]} muted loop playsInline
                  onTimeUpdate={e => { const v = e.currentTarget; if (v.duration) setVideoProgress((v.currentTime / v.duration) * 100); }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    {videoPlaying
                      ? <div className="flex gap-0.5"><div className="w-1 h-3 bg-white rounded-full"/><div className="w-1 h-3 bg-white rounded-full"/></div>
                      : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
                  </div>
                </div>
                {videoPlaying && <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"/>LIVE</div>}
              </div>
              <div className="px-4 py-3">
                <p className="text-white/30 text-[10px] uppercase">Meta Dreams</p>
                <p className="text-[#00D9FF] text-lg font-black">{viewCount.toLocaleString()}</p>
                <p className="text-white/30 text-[10px]">total streams</p>
              </div>
            </div>

            {/* CARD 2 — Stream Worldwide */}
            <div className="bg-[#0D1635] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-4 h-4 text-[#1DB954]" />
                <span className="text-white text-xs font-semibold">Stream Worldwide</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1DB954] to-[#00D9FF] flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">Holy Ground</p>
                  <p className="text-white/40 text-xs truncate">Grace Adele</p>
                </div>
                <button onClick={toggleAudio} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1DB954] to-[#00D9FF] flex items-center justify-center shrink-0">
                  {audioPlaying
                    ? <div className="flex gap-0.5"><div className="w-1 h-3 bg-white rounded-full"/><div className="w-1 h-3 bg-white rounded-full"/></div>
                    : <Play className="w-3 h-3 text-white fill-white ml-0.5" />}
                </button>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setAudioProgress(((e.clientX - r.left) / r.width) * 100); }}>
                <div className="h-full bg-gradient-to-r from-[#1DB954] to-[#00D9FF]" style={{ width: `${audioProgress}%` }} />
              </div>
              {audioPlaying && (
                <div className="flex items-end justify-center gap-0.5 h-4 mt-2">
                  {[3,5,4,7,5,6,3,5].map((h, i) => (
                    <div key={i} className="w-1 rounded-full bg-gradient-to-t from-[#1DB954] to-[#00D9FF] animate-pulse" style={{ height: `${h * 2}px`, animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              )}
            </div>

            {/* CARD 3 — Talent Winner */}
            <div className="bg-[#0D1635] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FFB800]/30 transition-colors flex">
              <div className="relative w-24 shrink-0">
                <img src={ARTIST_IMAGES[0]} alt="Winner" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-[#FFB800]" />
                  <span className="text-[#FFB800] text-[10px] font-bold uppercase">Winner</span>
                </div>
                <p className="text-white text-lg font-black tabular-nums">{liveVotes.toLocaleString()}</p>
                <p className="text-white/30 text-[10px] mb-2">votes live</p>
                <button
                  onClick={() => setVideoModalOpen(true)}
                  className="text-[#FFB800] text-xs font-semibold hover:underline"
                >
                  Watch Performance →
                </button>
              </div>
            </div>

            {/* CARD 4 — Distribution */}
            <div className="bg-[#0D1635] border border-white/10 rounded-2xl p-4 hover:border-[#00D9FF]/30 transition-colors flex flex-col justify-between">
              <div>
                <p className="text-white/40 text-[10px] uppercase mb-1">Distribution Network</p>
                <h3 className="text-xl font-black text-white">30+ Platforms</h3>
                <p className="text-white/40 text-xs mb-3">Upload once. Reach everywhere.</p>
                <p className="text-[#00F5A0] text-sm font-bold tabular-nums">{tracksDistributed.toLocaleString()}</p>
                <p className="text-white/30 text-[10px]">tracks distributed today</p>
              </div>
              <div className="overflow-hidden my-3">
                <div className="flex gap-2 animate-marquee whitespace-nowrap">
                  {[...DISTRIBUTION_PLATFORMS, ...DISTRIBUTION_PLATFORMS].map((p, i) => (
                    <span key={i} className="shrink-0 text-[10px] text-white/30 border border-white/10 rounded-full px-2 py-0.5">{p}</span>
                  ))}
                </div>
              </div>
              <Link to="/upload/distribute"
                className="text-center py-2 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black text-xs font-bold rounded-xl hover:opacity-90 transition-opacity">
                Start Distribution
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setVideoModalOpen(false)}>
          <div className="relative w-full max-w-3xl bg-[#0D1635] rounded-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-semibold text-sm">Featured Global Release · WANKONG</span>
              <button onClick={() => setVideoModalOpen(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">✕</button>
            </div>
            <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
              <video
                className="absolute inset-0 w-full h-full object-cover"
                poster={ARTIST_IMAGES[1]}
                controls
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">Meta Dreams</p>
                <p className="text-white/40 text-xs">Grace Adele · Manifesto EP</p>
              </div>
              <Link to="/talent-arena" onClick={() => setVideoModalOpen(false)} className="px-4 py-2 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold text-xs rounded-xl hover:opacity-90 transition-opacity">
                Vote in Competition →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Trending Books ─────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">

          {/* Section header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFB800]/20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Trending Books</h2>
                <p className="text-white/40 text-sm">Top reads in the community this week</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Scroll arrows */}
              <button
                onClick={() => scrollBooks('left')}
                aria-label="Scroll left"
                className="hidden md:flex w-9 h-9 rounded-full bg-white/5 border border-white/10 items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollBooks('right')}
                aria-label="Scroll right"
                className="hidden md:flex w-9 h-9 rounded-full bg-white/5 border border-white/10 items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <Link
                to="/collections/books"
                className="text-[#FFB800] hover:text-[#FFB800]/70 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                See All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Horizontal scroll strip */}
          <div className="relative">
            {/* Left fade */}
            <div className="pointer-events-none absolute top-0 left-0 h-full w-8 bg-gradient-to-r from-[#0A1128] to-transparent z-10" />
            {/* Right fade */}
            <div className="pointer-events-none absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-[#0A1128] to-transparent z-10" />

            <div
              ref={booksScrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {(trendingBooks.length > 0 ? trendingBooks : MOCK_BOOKS).map((book: any, i: number) => {
                const isMock = !book.gradient; // real product from Supabase won't have gradient
                const title = isMock ? book.title : (book.title || 'Untitled');
                const author = isMock ? book.author : (book.vendor || 'Unknown Author');
                const price = isMock ? book.price : (book.variants?.[0]?.price ? `$${parseFloat(book.variants[0].price).toFixed(2)}` : 'Free');
                const rating = isMock ? book.rating : 4;
                const bestseller = isMock ? book.bestseller : (i < 2);

                return (
                  <Link
                    key={book.id || i}
                    to="/collections/books"
                    className="shrink-0 w-36 md:w-44 group"
                  >
                    {/* Book cover — portrait 2:3 */}
                    <div className="relative rounded-xl overflow-hidden mb-3 shadow-xl shadow-black/40 group-hover:shadow-[#FFB800]/10 transition-shadow duration-300"
                      style={{ aspectRatio: '2/3' }}>

                      {/* Cover background */}
                      {isMock ? (
                        <div className={`absolute inset-0 bg-gradient-to-br ${book.gradient}`} />
                      ) : book.images?.[0] ? (
                        <img src={book.images[0]} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FFB800] to-[#FF6B00]" />
                      )}

                      {/* Spine shimmer line */}
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white/20 rounded-l-xl" />

                      {/* Book text overlay (mock only) */}
                      {isMock && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 py-3">
                          <span className="text-3xl mb-2 drop-shadow-lg">{book.emoji}</span>
                          <span className="text-white font-bold text-[11px] leading-tight drop-shadow">{title}</span>
                          <span className="text-white/60 text-[9px] mt-1">{book.genre}</span>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                          Read Preview
                        </span>
                      </div>

                      {/* Bestseller badge */}
                      {bestseller && (
                        <div className="absolute top-2 left-2 bg-[#FFB800] text-[#0A1128] text-[9px] font-black px-1.5 py-0.5 rounded leading-none">
                          BEST
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-white text-xs font-semibold leading-tight mb-1 line-clamp-2 group-hover:text-[#FFB800] transition-colors">
                      {title}
                    </h3>

                    {/* Author */}
                    <p className="text-white/40 text-[11px] mb-2 truncate">{author}</p>

                    {/* Price + Stars */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#FFB800] font-bold text-sm">{price}</span>
                      <div className="flex gap-px">
                        {[1,2,3,4,5].map(s => (
                          <Star
                            key={s}
                            className={`w-2.5 h-2.5 ${s <= rating ? 'fill-[#FFB800] text-[#FFB800]' : 'text-white/20'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* "See All" terminal card */}
              <Link
                to="/collections/books"
                className="shrink-0 w-36 md:w-44 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#FFB800]/30 hover:border-[#FFB800]/60 hover:bg-[#FFB800]/5 transition-all group"
                style={{ aspectRatio: '2/3', minHeight: 180 }}
              >
                <div className="w-10 h-10 rounded-full bg-[#FFB800]/10 border border-[#FFB800]/20 flex items-center justify-center group-hover:bg-[#FFB800]/20 transition-colors">
                  <ArrowRight className="w-5 h-5 text-[#FFB800]" />
                </div>
                <span className="text-[#FFB800] text-xs font-medium text-center leading-tight px-2">
                  Browse All Books
                </span>
              </Link>
            </div>
          </div>

          {/* Genre filter pills */}
          <div className="flex gap-2 mt-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['All', 'Devotional', 'Christian Living', 'Worship', 'Business', 'Prophecy', 'Parenting', 'Healing'].map(genre => (
              <Link
                key={genre}
                to={genre === 'All' ? '/collections/books' : `/collections/books?genre=${genre.toLowerCase().replace(/ /g, '-')}`}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all border-white/10 bg-white/5 text-white/50 hover:border-[#FFB800]/40 hover:bg-[#FFB800]/10 hover:text-[#FFB800]"
              >
                {genre}
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ── Featured Artists ─────────────────────────────────────── */}
      <section className="py-12 bg-[#0D1535]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#9D4EDD]/10 rounded-xl flex items-center justify-center">
                <span className="text-[#9D4EDD] text-lg">★</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Featured Artists</h2>
                <p className="text-white/40 text-xs">Verified creators on WANKONG</p>
              </div>
            </div>
            <Link to="/collections/music" className="text-[#00D9FF] text-sm hover:underline">See All</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {[
              { name: 'Celestine Ukwu', genre: 'Highlife', streams: '2.4M', flag: '🇳🇬', gradient: 'from-[#9D4EDD] to-[#00D9FF]' },
              { name: 'Sinach', genre: 'Gospel', streams: '18M', flag: '🇳🇬', gradient: 'from-[#FF6B00] to-[#FFB800]' },
              { name: 'Joe Mettle', genre: 'Gospel', streams: '5.1M', flag: '🇬🇭', gradient: 'from-[#00F5A0] to-[#00D9FF]' },
              { name: 'Femi Kuti', genre: 'Afrobeat', streams: '9.3M', flag: '🇳🇬', gradient: 'from-[#FFB800] to-[#FF6B00]' },
              { name: 'Soweto Gospel', genre: 'Gospel', streams: '3.7M', flag: '🇿🇦', gradient: 'from-[#00D9FF] to-[#9D4EDD]' },
              { name: 'Nathaniel Bassey', genre: 'Worship', streams: '12M', flag: '🇳🇬', gradient: 'from-[#9D4EDD] to-[#FF6B00]' },
            ].map((artist) => (
              <Link
                key={artist.name}
                to={`/artists/${artist.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="shrink-0 w-40 group"
              >
                <div className={`w-28 h-28 mx-auto rounded-full bg-gradient-to-br ${artist.gradient} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-lg`}>
                  <span className="text-4xl">{artist.flag}</span>
                </div>
                <p className="text-white text-sm font-semibold text-center truncate">{artist.name}</p>
                <p className="text-[#00D9FF] text-xs text-center">{artist.genre}</p>
                <p className="text-white/30 text-xs text-center">{artist.streams} streams</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top Creators This Week ───────────────────────────────── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FFB800]/10 rounded-xl flex items-center justify-center">
                <span className="text-[#FFB800] text-lg">🏆</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Top Creators This Week</h2>
                <p className="text-white/40 text-xs">Ranked by earnings &amp; engagement</p>
              </div>
            </div>
            <Link to="/dashboard/earnings" className="text-[#00D9FF] text-sm hover:underline">Leaderboard</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { rank: 1, name: 'Sinach', level: 'Diamond', earnings: '$4,280', badge: '👑', color: '#FFB800' },
              { rank: 2, name: 'Nathaniel Bassey', level: 'Platinum', earnings: '$3,150', badge: '💎', color: '#00D9FF' },
              { rank: 3, name: 'Joe Mettle', level: 'Gold', earnings: '$2,890', badge: '⭐', color: '#FFB800' },
            ].map((creator) => (
              <div key={creator.rank} className="flex items-center gap-4 bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors border border-white/5">
                <span className="text-2xl font-black" style={{ color: creator.color }}>#{creator.rank}</span>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center text-lg shrink-0">{creator.badge}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{creator.name}</p>
                  <p className="text-white/40 text-xs">{creator.level}</p>
                </div>
                <span className="text-[#00F5A0] font-bold text-sm shrink-0">{creator.earnings}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Audiobooks Discovery ──────────────────────────────────── */}
      <section className="py-12 bg-[#0D1535]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center">
                <span className="text-[#FF6B00] text-lg">🎧</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Audiobooks</h2>
                <p className="text-white/40 text-xs">Listen while you move</p>
              </div>
            </div>
            <Link to="/ebook-marketplace" className="text-[#00D9FF] text-sm hover:underline">See All Books</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {[
              { title: 'Prayer That Moves Mountains', author: 'E.M. Bounds', lang: 'EN', hours: '4.2h', gradient: 'from-[#FF6B00] to-[#FFB800]' },
              { title: 'Purpose Driven Life', author: 'Rick Warren', lang: 'FR', hours: '8.5h', gradient: 'from-[#9D4EDD] to-[#00D9FF]' },
              { title: 'Kingdom Principles', author: 'Myles Munroe', lang: 'SW', hours: '6.1h', gradient: 'from-[#00F5A0] to-[#00D9FF]' },
              { title: 'The Power of Now', author: 'Eckhart Tolle', lang: 'AR', hours: '7.3h', gradient: 'from-[#00D9FF] to-[#9D4EDD]' },
              { title: 'Battlefield of the Mind', author: 'Joyce Meyer', lang: 'YO', hours: '5.8h', gradient: 'from-[#FFB800] to-[#FF6B00]' },
            ].map((ab) => (
              <div key={ab.title} className="shrink-0 w-44 cursor-pointer group">
                <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${ab.gradient} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-lg`}>
                  <span className="text-4xl">🎧</span>
                </div>
                <p className="text-white text-sm font-semibold truncate">{ab.title}</p>
                <p className="text-white/50 text-xs truncate">{ab.author}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-[#FF6B00]/20 text-[#FF6B00] px-1.5 py-0.5 rounded">{ab.lang}</span>
                  <span className="text-white/30 text-[10px]">{ab.hours}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trending Performances ────────────────────────────────── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#00F5A0]/10 rounded-xl flex items-center justify-center">
                <span className="text-[#00F5A0] text-lg">🎭</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Trending Performances</h2>
                <p className="text-white/40 text-xs">Live from the Talent Arena</p>
              </div>
            </div>
            <Link to="/collections/talent-arena" className="text-[#00D9FF] text-sm hover:underline">View Arena</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { title: 'Amazing Grace Cover', performer: 'Adaeze Obi', votes: '1.2K', lang: 'EN', gradient: 'from-[#9D4EDD]/40 to-[#00D9FF]/20' },
              { title: 'Spontaneous Worship', performer: 'Kofi Mensah', votes: '987', lang: 'YO', gradient: 'from-[#FF6B00]/40 to-[#FFB800]/20' },
              { title: 'Gospel Medley', performer: 'Amara Diallo', votes: '2.1K', lang: 'FR', gradient: 'from-[#00F5A0]/30 to-[#00D9FF]/20' },
              { title: 'Live Praise Session', performer: 'Zara Ibrahim', votes: '654', lang: 'AR', gradient: 'from-[#FFB800]/30 to-[#FF6B00]/20' },
            ].map((perf) => (
              <Link key={perf.title} to="/collections/talent-arena" className="group block">
                <div className={`w-full aspect-video rounded-xl bg-gradient-to-br ${perf.gradient} border border-white/10 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform relative overflow-hidden`}>
                  <span className="text-3xl">🎤</span>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-[#00F5A0] text-[10px] font-bold px-2 py-0.5 rounded-full">❤ {perf.votes}</div>
                </div>
                <p className="text-white text-xs font-semibold truncate">{perf.title}</p>
                <p className="text-white/40 text-[10px] truncate">{perf.performer}</p>
                <span className="text-[10px] bg-[#9D4EDD]/20 text-[#9D4EDD] px-1.5 py-0.5 rounded mt-1 inline-block">{perf.lang}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Global Stage — Featured Performances ─────────────── */}
      <FeaturedPerformancesGrid />

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

      {/* ── Recently Played (from GlobalPlayer history) ───────────── */}
      {recentlyPlayed.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white/40" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Recently Played</h2>
                  <p className="text-white/30 text-xs">Pick up where you left off</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {recentlyPlayed.map(track => {
                const art = track.albumArt || track.cover || '';
                return (
                  <button
                    key={track.id}
                    onClick={() => playerPlay(track)}
                    className="shrink-0 w-36 text-left group hover:bg-white/5 rounded-xl p-2 transition-colors"
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2 bg-white/5">
                      {art
                        ? <img src={art} alt={track.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center"><Music className="w-8 h-8 text-white/30" /></div>}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="text-white text-xs font-semibold truncate">{track.title}</p>
                    <p className="text-white/40 text-[10px] truncate">{track.artist}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
