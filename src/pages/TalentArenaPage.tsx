import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CompetitionRoomCard, { RoomCardData } from '@/components/competition/CompetitionRoomCard';
import CompetitionCountdown from '@/components/competition/CompetitionCountdown';
import DefaultPerformanceThumbnail from '@/components/media/DefaultPerformanceThumbnail';
import { Trophy, Play, Heart, Bell, Upload, Star, Loader2, ChevronRight, TrendingUp, Clock } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Entry {
  id: string;
  competitionId: string;
  artistName: string;
  title: string;
  mediaUrl: string;
  mediaType: 'audio' | 'video';
  votes: number;
  hasVoted?: boolean;
  avatarColor: string;
  thumbnailUrl?: string | null;
}

interface WeeklyWinner {
  week: string;
  competitionTitle: string;
  artistName: string;
  prize: string;
  votes: number;
  gradient?: string;
}

interface UpcomingComp {
  id: string;
  title: string;
  category: string;
  prize: string;
  startsAt: string;
  gradient: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_LIVE_ROOMS: RoomCardData[] = [
  {
    id: 'room-1',
    title: 'Gospel Voices 2025',
    category: 'Gospel',
    description: 'Showcase your vocal talent in this premier gospel singing competition.',
    prize_info: '$2,000',
    entry_count: 47,
    deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'live',
    gradient: 'from-[#9D4EDD]/50 to-[#00D9FF]/30',
  },
  {
    id: 'room-2',
    title: 'Praise & Worship Challenge',
    category: 'Worship',
    description: 'Submit your best praise and worship performance. Originals and covers welcome.',
    prize_info: '$1,500',
    entry_count: 23,
    deadline: new Date(Date.now() + 9 * 86400000).toISOString(),
    status: 'live',
    gradient: 'from-[#FFB800]/40 to-[#FF6B00]/20',
  },
  {
    id: 'room-3',
    title: 'Christian Hip-Hop Cypher',
    category: 'Hip-Hop',
    description: 'Drop your best bars for Christ. 2-minute max freestyle or written verse.',
    prize_info: '$1,000',
    entry_count: 14,
    deadline: new Date(Date.now() + 13 * 86400000).toISOString(),
    status: 'live',
    gradient: 'from-[#00F5A0]/40 to-[#00D9FF]/20',
  },
  {
    id: 'room-4',
    title: 'Afrobeats Gospel Fusion',
    category: 'Afrobeats',
    description: 'Blend afrobeats with gospel for a unique musical experience.',
    prize_info: '$800',
    entry_count: 8,
    deadline: new Date(Date.now() + 6 * 86400000).toISOString(),
    status: 'live',
    gradient: 'from-[#FF6B00]/40 to-[#9D4EDD]/20',
  },
];

const MOCK_VOTE_ENTRIES: Entry[] = [
  { id: 'e1', competitionId: 'room-1', artistName: 'Grace Adele', title: 'His Mercy Endures', mediaUrl: '', mediaType: 'audio', votes: 234, avatarColor: 'from-[#9D4EDD] to-[#00D9FF]' },
  { id: 'e2', competitionId: 'room-1', artistName: 'Samuel K', title: 'Amazing Grace (Reimagined)', mediaUrl: '', mediaType: 'audio', votes: 189, avatarColor: 'from-[#FFB800] to-[#FF6B00]' },
  { id: 'e3', competitionId: 'room-1', artistName: 'Joy Ministries', title: 'Overflow', mediaUrl: '', mediaType: 'video', votes: 156, avatarColor: 'from-[#00F5A0] to-[#00D9FF]' },
  { id: 'e4', competitionId: 'room-2', artistName: 'David Praise', title: 'Mountains Move', mediaUrl: '', mediaType: 'audio', votes: 98, avatarColor: 'from-[#FF6B00] to-[#FFB800]' },
  { id: 'e5', competitionId: 'room-2', artistName: 'Faith Choir', title: 'Holy Atmosphere', mediaUrl: '', mediaType: 'video', votes: 76, avatarColor: 'from-[#00D9FF] to-[#9D4EDD]' },
  { id: 'e6', competitionId: 'room-3', artistName: 'Blessed MC', title: 'Kingdom Flow', mediaUrl: '', mediaType: 'audio', votes: 62, avatarColor: 'from-[#9D4EDD] to-[#FF6B00]' },
];

const MOCK_UPCOMING: UpcomingComp[] = [
  { id: 'u1', title: 'Traditional Worship Showdown', category: 'Traditional', prize: '$3,000', startsAt: new Date(Date.now() + 21 * 86400000).toISOString(), gradient: 'from-[#9D4EDD]/50 to-[#00D9FF]/30' },
  { id: 'u2', title: 'Choir Battle Season 2', category: 'Choir', prize: '$2,500', startsAt: new Date(Date.now() + 30 * 86400000).toISOString(), gradient: 'from-[#FFB800]/40 to-[#FF6B00]/20' },
  { id: 'u3', title: 'Spoken Word Sunday', category: 'Spoken Word', prize: '$1,200', startsAt: new Date(Date.now() + 45 * 86400000).toISOString(), gradient: 'from-[#00F5A0]/40 to-[#00D9FF]/20' },
];

const MOCK_WINNERS: WeeklyWinner[] = [
  { week: 'Week of Apr 1, 2025', competitionTitle: 'Easter Special Praise', artistName: 'Emmanuel Voices', prize: '$800', votes: 1204, gradient: 'from-[#FFB800]/40 to-[#FF6B00]/20' },
  { week: 'Week of Mar 24, 2025', competitionTitle: 'Midnight Worship Battle', artistName: 'Zion Heights', prize: '$800', votes: 987, gradient: 'from-[#9D4EDD]/50 to-[#00D9FF]/30' },
  { week: 'Week of Mar 17, 2025', competitionTitle: "God's Grace Challenge", artistName: 'Miriam D.', prize: '$600', votes: 834, gradient: 'from-[#00F5A0]/40 to-[#00D9FF]/20' },
];

const CATEGORY_FILTERS = ['All', 'Music', 'Dance', 'Comedy', 'Spoken Word', 'Choir', 'Gospel', 'Traditional', 'Afrobeats'];
const SORT_OPTIONS = ['Most Voted', 'Newest', 'Trending', "Editor's Picks"];

// Session-level vote dedup
const votedSet = new Set<string>();

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden animate-pulse">
      <div className="h-40 bg-white/5" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-white/10 rounded w-3/4" />
        <div className="h-2 bg-white/5 rounded w-1/2" />
        <div className="h-8 bg-white/5 rounded mt-3" />
        <div className="h-8 bg-gradient-to-r from-[#9D4EDD]/20 to-[#00D9FF]/20 rounded" />
      </div>
    </div>
  );
}

// ── Vote Button (inline, session-level) ───────────────────────────────────────
function InlineVoteButton({ entry, onVote }: { entry: Entry; onVote: (id: string) => void }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const voted      = votedSet.has(entry.id);

  const handleClick = async () => {
    if (!user) { navigate('/auth/login'); return; }
    if (voted) return;
    votedSet.add(entry.id);
    onVote(entry.id);
    try {
      await supabase.from('competition_votes').insert({
        entry_id:   entry.id,
        user_id:    user.id,
        session_id: sessionStorage.getItem('vid') || Math.random().toString(36).slice(2),
      });
    } catch { /* server dedup handles conflicts */ }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
        ${voted ? 'bg-[#FF6B00]/20 text-[#FF6B00] cursor-default' : 'bg-white/10 text-white hover:bg-[#FF6B00]/20 hover:text-[#FF6B00]'}`}
    >
      <Heart className={`w-3.5 h-3.5 ${voted ? 'fill-[#FF6B00]' : ''}`} />
      {entry.votes.toLocaleString()} {voted ? '(voted)' : 'Vote'}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TalentArenaPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const userRole  = user?.user_metadata?.role || 'user';
  const isSinger  = ['singer_artist', 'admin'].includes(userRole);

  const [loading,   setLoading]   = useState(true);
  const [category,  setCategory]  = useState('All');
  const [sort,      setSort]      = useState('Most Voted');
  const [entries,   setEntries]   = useState<Entry[]>(MOCK_VOTE_ENTRIES);
  const [notified,  setNotified]  = useState<Set<string>>(new Set());
  const [heroBg,    setHeroBg]    = useState(0);

  // Submission form state (preserved from original)
  const [subForm, setSubForm] = useState({ competitionId: '', title: '', mediaType: 'audio' as 'audio' | 'video', mediaFile: null as File | null });
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subSuccess,    setSubSuccess]    = useState(false);

  // Animate hero gradient
  useEffect(() => {
    const id = setInterval(() => setHeroBg(p => (p + 1) % 3), 4000);
    return () => clearInterval(id);
  }, []);

  // Simulate loading
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(id);
  }, []);

  // Realtime votes subscription
  useEffect(() => {
    const ch = supabase
      .channel('talent-arena-votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'competition_votes' }, payload => {
        setEntries(prev => prev.map(e => e.id === payload.new.entry_id ? { ...e, votes: e.votes + 1 } : e));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleVote = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, votes: e.votes + 1 } : e));
  };

  const handleNotify = async (compId: string) => {
    if (!user) { navigate('/auth/login'); return; }
    setNotified(prev => new Set(prev).add(compId));
    try {
      await supabase.from('competition_notifications').insert({ competition_id: compId, user_id: user.id });
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    setSubSubmitting(true);
    try {
      await supabase.from('admin_logs').insert({
        action: 'talent_entry_submitted',
        entity_type: 'competition_entry',
        entity_id: subForm.competitionId,
        details: { title: subForm.title, mediaType: subForm.mediaType },
        performed_by: user?.id,
      });
      setSubSuccess(true);
    } catch { /* ignore */ } finally { setSubSubmitting(false); }
  };

  // Filter + sort entries
  const filteredRooms = category === 'All'
    ? MOCK_LIVE_ROOMS
    : MOCK_LIVE_ROOMS.filter(r => r.category?.toLowerCase() === category.toLowerCase());

  const sortedEntries = [...entries].sort((a, b) =>
    sort === 'Most Voted' ? b.votes - a.votes : b.id.localeCompare(a.id)
  );

  const heroBgs = [
    'from-[#9D4EDD]/30 via-[#0A1128] to-[#00D9FF]/20',
    'from-[#FFB800]/25 via-[#0A1128] to-[#9D4EDD]/20',
    'from-[#00D9FF]/25 via-[#0A1128] to-[#00F5A0]/20',
  ];

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className={`absolute inset-0 bg-gradient-to-br ${heroBgs[heroBg]} transition-all duration-[3000ms]`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(157,78,221,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,217,255,0.12),transparent_55%)]" />

        <div className="relative max-w-6xl mx-auto px-4 lg:px-8 py-20">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse" />
            <span className="text-[#00F5A0] text-xs font-bold uppercase tracking-widest">Live Now</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-none">
            Upload. Compete.<br />
            <span className="bg-gradient-to-r from-[#9D4EDD] via-[#00D9FF] to-[#00F5A0] bg-clip-text text-transparent">
              Win Prizes.
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-lg mb-8 leading-relaxed">
            The global stage for gospel artists. Compete in live arenas, earn real prizes, and get discovered by millions.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard/artist/upload-performance"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25"
            >
              <Upload className="w-4 h-4" /> Submit Performance
            </Link>
            <a
              href="#live-rooms"
              className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/15 text-white font-semibold rounded-xl text-sm hover:bg-white/15 transition-colors"
            >
              <Play className="w-4 h-4" /> Explore Rooms
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-10">
            {[['$8,400', 'Total Prizes Awarded'], ['1,204', 'Highest Vote Count'], ['47', 'Active Entries']].map(([val, lbl]) => (
              <div key={lbl}>
                <p className="text-2xl font-black text-white">{val}</p>
                <p className="text-gray-500 text-xs">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FILTER BAR ── */}
      <div className="sticky top-0 z-20 bg-[#0A1128]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                ${category === cat
                  ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              {cat}
            </button>
          ))}
          <div className="ml-auto shrink-0">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#9D4EDD]/50"
            >
              {SORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8">

        {/* ── LIVE ROOMS ── */}
        <section id="live-rooms" className="py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse" />
                <span className="text-[#00F5A0] text-xs font-bold uppercase tracking-widest">Live</span>
              </div>
              <h2 className="text-2xl font-black text-white">Active Competition Rooms</h2>
            </div>
            <Link to="/collections/talent-arena" className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No rooms match this filter.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredRooms.map(room => (
                <CompetitionRoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </section>

        {/* ── OPEN VOTING NOW ── */}
        <section className="py-12 border-t border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span className="text-[#FF6B00] text-xs font-bold uppercase tracking-widest">Vote Now</span>
              </div>
              <h2 className="text-2xl font-black text-white">Open Voting</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse" />
              Real-time votes
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedEntries.map((entry, idx) => (
                <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all group">
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden">
                    {entry.thumbnailUrl ? (
                      <img src={entry.thumbnailUrl} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <DefaultPerformanceThumbnail
                        gradient={entry.avatarColor}
                        label={entry.title}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {/* Rank badge */}
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                      ${idx === 0 ? 'bg-[#FFB800] text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/20 text-white'}`}>
                      #{idx + 1}
                    </div>
                    {/* Media type */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-gray-300 uppercase">
                      {entry.mediaType}
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-3">
                    <p className="text-white font-semibold text-sm truncate">{entry.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{entry.artistName}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-500 rounded-full">{entry.competitionId.replace('room-', 'Room #')}</span>
                      <InlineVoteButton entry={entry} onVote={handleVote} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── UPCOMING COMPETITIONS ── */}
        <section className="py-12 border-t border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span className="text-[#00D9FF] text-xs font-bold uppercase tracking-widest">Coming Soon</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-6">Upcoming Competitions</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_UPCOMING.map(comp => {
              const isNotified = notified.has(comp.id);
              return (
                <div key={comp.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-[#00D9FF]/30 transition-all">
                  {/* Thumbnail */}
                  <div className="relative h-36 overflow-hidden">
                    <DefaultPerformanceThumbnail gradient={comp.gradient} label={comp.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128]/80 to-transparent" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#00D9FF]/20 border border-[#00D9FF]/30 text-[#00D9FF] text-[9px] font-bold rounded-full">
                      UPCOMING
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#FFB800] text-black text-[9px] font-black rounded-lg">
                      {comp.prize}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-white font-semibold text-sm truncate">{comp.title}</p>
                    <p className="text-xs text-gray-400 mb-3">{comp.category}</p>
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-500 mb-1">Starts in</p>
                      <CompetitionCountdown deadline={comp.startsAt} compact />
                    </div>
                    <button
                      onClick={() => handleNotify(comp.id)}
                      disabled={isNotified}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all
                        ${isNotified
                          ? 'bg-[#00F5A0]/10 text-[#00F5A0] border border-[#00F5A0]/20 cursor-default'
                          : 'bg-white/5 border border-white/10 text-gray-300 hover:border-[#00D9FF]/40 hover:text-[#00D9FF]'}`}
                    >
                      <Bell className={`w-3.5 h-3.5 ${isNotified ? 'fill-[#00F5A0]' : ''}`} />
                      {isNotified ? 'Notified!' : 'Notify Me'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PAST WINNERS ── */}
        <section className="py-12 border-t border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-3.5 h-3.5 text-[#FFB800]" />
                <span className="text-[#FFB800] text-xs font-bold uppercase tracking-widest">Hall of Fame</span>
              </div>
              <h2 className="text-2xl font-black text-white">Past Winners</h2>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[['$8,400', 'Total Prizes Awarded'], ['1,204', 'Highest Vote Count'], ['12', 'Competitions Held']].map(([val, lbl]) => (
              <div key={lbl} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-[#FFB800]">{val}</p>
                <p className="text-gray-400 text-xs mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_WINNERS.map((w, i) => (
              <div key={i} className="bg-white/5 border border-[#FFB800]/20 rounded-xl overflow-hidden hover:border-[#FFB800]/40 transition-all">
                {/* Thumbnail */}
                <div className="relative h-32 overflow-hidden">
                  <DefaultPerformanceThumbnail gradient={w.gradient ?? 'from-[#FFB800]/40 to-[#FF6B00]/20'} label={w.artistName} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128]/80 to-transparent" />
                  {/* Gold winner badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-[#FFB800] text-black text-[9px] font-black rounded-full">
                    <Trophy className="w-2.5 h-2.5" /> WINNER
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-white font-semibold text-sm">{w.artistName}</p>
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{w.competitionTitle}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{w.week}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[#FFB800] font-black text-base">{w.prize}</span>
                    <span className="text-xs text-gray-500">{w.votes.toLocaleString()} votes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SUBMIT CTA STRIP ── */}
        <section className="py-12 border-t border-white/5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9D4EDD]/20 via-[#0D1635] to-[#00D9FF]/10 border border-[#9D4EDD]/20 p-8 md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(157,78,221,0.15),transparent_60%)]" />

            {/* Preview film strip */}
            <div className="absolute right-0 top-0 bottom-0 w-64 hidden md:flex flex-col gap-1 p-2 opacity-40 overflow-hidden">
              {['from-[#9D4EDD]/60 to-[#00D9FF]/30', 'from-[#FFB800]/50 to-[#FF6B00]/30', 'from-[#00F5A0]/50 to-[#00D9FF]/30', 'from-[#FF6B00]/50 to-[#9D4EDD]/30', 'from-[#00D9FF]/50 to-[#9D4EDD]/30'].map((g, i) => (
                <div key={i} className={`flex-1 rounded-lg bg-gradient-to-br ${g} flex items-center justify-center`}>
                  <Play className="w-4 h-4 text-white/40 fill-white/20" />
                </div>
              ))}
            </div>

            <div className="relative max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-5 h-5 text-[#9D4EDD]" />
                <span className="text-[#9D4EDD] text-xs font-bold uppercase tracking-widest">For Artists</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-3">
                Ready to compete?
              </h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Upload your performance, get AI-scored, and compete against artists worldwide for real cash prizes.
              </p>

              {/* Pipeline */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-6">
                {['Upload', '→', 'AI Review', '→', 'Admin Approval', '→', 'Public Vote', '→', 'Win'].map((step, i) => (
                  <span key={i} className={step === '→' ? 'text-gray-700' : 'bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400'}>{step}</span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/dashboard/artist/upload-performance"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
                >
                  <Upload className="w-4 h-4" /> Submit Your Entry
                </Link>
                {!user && (
                  <Link
                    to="/auth/login"
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/15 text-white font-semibold rounded-xl text-sm hover:bg-white/15 transition-colors"
                  >
                    Sign In First
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
