import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Competition {
  id: string;
  title: string;
  description: string;
  category: string;
  prize: string;
  deadline: string;
  status: 'active' | 'voting' | 'ended';
  entries: number;
  coverUrl: string;
}

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
}

interface WeeklyWinner {
  week: string;
  competitionTitle: string;
  artistName: string;
  prize: string;
  votes: number;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_COMPETITIONS: Competition[] = [
  {
    id: 'comp-1',
    title: 'Gospel Voices 2025',
    description: 'Showcase your vocal talent in this premier gospel singing competition. Open to all genres of gospel.',
    category: 'Gospel',
    prize: '$2,000',
    deadline: '2025-04-30',
    status: 'voting',
    entries: 47,
    coverUrl: 'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047590438_0a152d8a.png',
  },
  {
    id: 'comp-2',
    title: 'Praise & Worship Challenge',
    description: 'Submit your best praise and worship performance. Both originals and covers are welcome.',
    category: 'Worship',
    prize: '$1,500',
    deadline: '2025-05-15',
    status: 'active',
    entries: 23,
    coverUrl: 'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047590438_0a152d8a.png',
  },
  {
    id: 'comp-3',
    title: 'Christian Hip-Hop Cypher',
    description: 'Drop your best bars for Christ. 2-minute max freestyle or written verse.',
    category: 'Hip-Hop',
    prize: '$1,000',
    deadline: '2025-06-01',
    status: 'active',
    entries: 14,
    coverUrl: 'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047590438_0a152d8a.png',
  },
];

const MOCK_ENTRIES: Entry[] = [
  { id: 'e1', competitionId: 'comp-1', artistName: 'Grace Adele', title: 'His Mercy Endures', mediaUrl: '', mediaType: 'audio', votes: 234, avatarColor: 'from-[#9D4EDD] to-[#00D9FF]' },
  { id: 'e2', competitionId: 'comp-1', artistName: 'Samuel K', title: 'Amazing Grace (Reimagined)', mediaUrl: '', mediaType: 'audio', votes: 189, avatarColor: 'from-[#FFB800] to-[#FF6B00]' },
  { id: 'e3', competitionId: 'comp-1', artistName: 'Joy Ministries', title: 'Overflow', mediaUrl: '', mediaType: 'video', votes: 156, avatarColor: 'from-[#00F5A0] to-[#00D9FF]' },
  { id: 'e4', competitionId: 'comp-1', artistName: 'David Praise', title: 'Mountains Move', mediaUrl: '', mediaType: 'audio', votes: 98, avatarColor: 'from-[#FF6B00] to-[#FFB800]' },
  { id: 'e5', competitionId: 'comp-1', artistName: 'Faith Choir', title: 'Holy Atmosphere', mediaUrl: '', mediaType: 'video', votes: 76, avatarColor: 'from-[#00D9FF] to-[#9D4EDD]' },
];

const MOCK_WINNERS: WeeklyWinner[] = [
  { week: 'Week of Apr 1, 2025', competitionTitle: 'Easter Special Praise', artistName: 'Emmanuel Voices', prize: '$800', votes: 1204 },
  { week: 'Week of Mar 24, 2025', competitionTitle: 'Midnight Worship Battle', artistName: 'Zion Heights', prize: '$800', votes: 987 },
  { week: 'Week of Mar 17, 2025', competitionTitle: "God's Grace Challenge", artistName: 'Miriam D.', prize: '$600', votes: 834 },
];

// ── Countdown ─────────────────────────────────────────────────────────────────
function useCountdown(deadline: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return timeLeft;
}

function Countdown({ deadline }: { deadline: string }) {
  const t = useCountdown(deadline);
  return (
    <div className="flex gap-2">
      {[['days', t.days], ['hrs', t.hours], ['min', t.minutes], ['sec', t.seconds]].map(([label, val]) => (
        <div key={label as string} className="bg-white/5 rounded-lg px-2 py-1 text-center min-w-[42px]">
          <p className="text-white font-bold text-sm tabular-nums">{String(val).padStart(2,'0')}</p>
          <p className="text-gray-500 text-[10px]">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Vote Button ───────────────────────────────────────────────────────────────
const votedSet = new Set<string>(); // session-level dedup

function VoteButton({ entry, onVote }: { entry: Entry; onVote: (id: string) => void }) {
  const [voted, setVoted] = useState(votedSet.has(entry.id));
  const handleClick = async () => {
    if (voted) return;
    votedSet.add(entry.id);
    setVoted(true);
    onVote(entry.id);
    try {
      await supabase.from('competition_votes').insert({ entry_id: entry.id, session_id: sessionStorage.getItem('vid') || Math.random().toString(36).slice(2) });
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${voted ? 'bg-[#9D4EDD]/20 text-[#9D4EDD] border border-[#9D4EDD]/30 cursor-default' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-[#9D4EDD]/10 hover:text-[#9D4EDD] hover:border-[#9D4EDD]/30'}`}
    >
      {voted ? '♥ Voted' : '♡ Vote'}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TalentArenaPage() {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role || 'user';
  const isSinger = ['singer_artist', 'admin'].includes(userRole);

  const [tab, setTab] = useState<'competitions' | 'leaderboard' | 'winners' | 'submit'>('competitions');
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [entries, setEntries] = useState<Entry[]>(MOCK_ENTRIES);

  // Submission form
  const [subForm, setSubForm] = useState({ competitionId: '', title: '', mediaType: 'audio' as 'audio' | 'video', mediaFile: null as File | null });
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subSuccess, setSubSuccess] = useState(false);

  // Realtime votes subscription
  useEffect(() => {
    if (!selectedComp) return;
    const channel = supabase
      .channel('votes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'competition_votes' }, (payload) => {
        setEntries(prev => prev.map(e => e.id === payload.new.entry_id ? { ...e, votes: e.votes + 1 } : e));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedComp]);

  const handleVote = (entryId: string) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, votes: e.votes + 1 } : e));
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
    } catch { /* ignore */ } finally {
      setSubSubmitting(false);
    }
  };

  const leaderboard = selectedComp
    ? [...entries].filter(e => e.competitionId === selectedComp.id).sort((a, b) => b.votes - a.votes)
    : [...entries].sort((a, b) => b.votes - a.votes);

  const TABS = [
    { id: 'competitions', label: 'Competitions', icon: '🏆' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '📊' },
    { id: 'winners', label: 'Past Winners', icon: '🌟' },
    ...(isSinger ? [{ id: 'submit', label: 'Submit Entry', icon: '🎤' }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A1128] via-[#100D2E] to-[#0A1128] border-b border-white/5 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(157,78,221,0.15),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center text-xl">🎤</div>
            <span className="text-[#9D4EDD] text-sm font-medium uppercase tracking-widest">Talent Arena</span>
          </div>
          <h1 className="text-5xl font-black text-white mb-3">Compete. <span className="bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] bg-clip-text text-transparent">Vote. Win.</span></h1>
          <p className="text-gray-400 text-lg max-w-xl">The ultimate platform for gospel artists to showcase talent, gain fans, and earn real prizes.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${tab === t.id ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Competitions Tab */}
        {tab === 'competitions' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MOCK_COMPETITIONS.map(c => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
                <div className="relative h-40 overflow-hidden">
                  <img src={c.coverUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${c.status === 'voting' ? 'bg-[#9D4EDD]/80 text-white' : c.status === 'active' ? 'bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30' : 'bg-white/10 text-gray-400'}`}>
                      {c.status === 'voting' ? '🗳️ Voting Live' : c.status === 'active' ? '✅ Open' : '🏁 Ended'}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-[#FFB800] text-black text-xs font-bold px-2 py-1 rounded-lg">{c.prize}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-white">{c.title}</h3>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">{c.entries} entries</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-3 line-clamp-2">{c.description}</p>
                  <div className="mb-4">
                    <p className="text-gray-500 text-xs mb-1">Time remaining:</p>
                    <Countdown deadline={c.deadline} />
                  </div>
                  <div className="flex gap-2">
                    {c.status === 'voting' && (
                      <button onClick={() => { setSelectedComp(c); setTab('leaderboard'); }} className="flex-1 py-2 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl text-xs font-medium">Vote Now</button>
                    )}
                    {isSinger && c.status === 'active' && (
                      <button onClick={() => { setSubForm(f => ({...f, competitionId: c.id})); setTab('submit'); }} className="flex-1 py-2 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white rounded-xl text-xs font-medium">Enter</button>
                    )}
                    {c.status === 'ended' && (
                      <button onClick={() => { setSelectedComp(c); setTab('leaderboard'); }} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-xl text-xs border border-white/10">View Results</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div>
            {/* Competition Selector */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
              <button onClick={() => setSelectedComp(null)} className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${!selectedComp ? 'bg-white/15 text-white border border-white/20' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>All</button>
              {MOCK_COMPETITIONS.map(c => (
                <button key={c.id} onClick={() => setSelectedComp(c)} className={`px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${selectedComp?.id === c.id ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{c.title}</button>
              ))}
            </div>

            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div key={entry.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${index === 0 ? 'bg-gradient-to-r from-[#FFB800]/10 to-transparent border-[#FFB800]/20' : index === 1 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/20' : index === 2 ? 'bg-gradient-to-r from-[#FF6B00]/10 to-transparent border-[#FF6B00]/20' : 'bg-white/3 border-white/5 hover:border-white/10'}`}>
                  {/* Rank */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${index === 0 ? 'bg-[#FFB800]/20 text-[#FFB800]' : index === 1 ? 'bg-gray-400/20 text-gray-300' : index === 2 ? 'bg-[#FF6B00]/20 text-[#FF6B00]' : 'bg-white/5 text-gray-500'}`}>
                    {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
                  </div>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${entry.avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {entry.artistName[0]}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{entry.title}</p>
                    <p className="text-gray-400 text-xs">{entry.artistName}</p>
                  </div>
                  {/* Media badge */}
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg capitalize hidden sm:block">{entry.mediaType}</span>
                  {/* Votes */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white text-sm">{entry.votes.toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">votes</p>
                  </div>
                  {/* Vote button */}
                  {MOCK_COMPETITIONS.find(c => c.id === entry.competitionId)?.status === 'voting' && (
                    <VoteButton entry={entry} onVote={handleVote} />
                  )}
                </div>
              ))}
            </div>

            {/* Realtime note */}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-pulse inline-block" />
              Votes update in real-time via Supabase subscriptions
            </div>
          </div>
        )}

        {/* Past Winners Tab */}
        {tab === 'winners' && (
          <div>
            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {['Most Votes Ever', 'Total Prize Money', 'Total Competitions'].map((label, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-black text-white mb-1">{i === 0 ? '1,204' : i === 1 ? '$8,400' : '12'}</p>
                  <p className="text-gray-400 text-sm">{label}</p>
                </div>
              ))}
            </div>

            <h2 className="text-lg font-bold text-white mb-4">Weekly Winners Archive</h2>
            <div className="space-y-3">
              {MOCK_WINNERS.map((w, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFB800] to-[#FF6B00] flex items-center justify-center text-lg shrink-0">🏆</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{w.artistName}</p>
                    <p className="text-gray-400 text-xs">{w.competitionTitle} · {w.week}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#FFB800] font-bold text-sm">{w.prize}</p>
                    <p className="text-gray-500 text-xs">{w.votes.toLocaleString()} votes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Tab (singer_artist only) */}
        {tab === 'submit' && (
          <div className="max-w-xl mx-auto">
            {!isSinger ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-white mb-2">Artist Account Required</h3>
                <p className="text-gray-400">Only verified singer/artist accounts can submit competition entries.</p>
              </div>
            ) : !subSuccess ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Submit Your Entry</h2>
                  <p className="text-gray-400 text-sm">Entries go through AI quality screening then admin review before going live.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Competition *</label>
                  <select value={subForm.competitionId} onChange={e => setSubForm(f => ({...f, competitionId: e.target.value}))} className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#9D4EDD]/50">
                    <option value="">Choose a competition…</option>
                    {MOCK_COMPETITIONS.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.title} — {c.prize}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Entry Title *</label>
                  <input value={subForm.title} onChange={e => setSubForm(f => ({...f, title: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#9D4EDD]/50" placeholder="Name your submission" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Media Type</label>
                  <div className="flex gap-3">
                    {(['audio', 'video'] as const).map(t => (
                      <button key={t} onClick={() => setSubForm(f => ({...f, mediaType: t}))} className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${subForm.mediaType === t ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Upload {subForm.mediaType === 'video' ? 'Video (MP4/MOV, max 500MB)' : 'Audio (MP3/WAV, max 100MB)'}</label>
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-[#9D4EDD]/30 transition-colors cursor-pointer" onClick={() => document.getElementById('talent-upload')?.click()}>
                    {subForm.mediaFile ? (
                      <div className="text-[#9D4EDD] text-sm">✓ {subForm.mediaFile.name}</div>
                    ) : (
                      <>
                        <div className="text-4xl mb-3">{subForm.mediaType === 'video' ? '🎬' : '🎤'}</div>
                        <p className="text-gray-400 text-sm">Click to upload your entry</p>
                      </>
                    )}
                    <input id="talent-upload" type="file" accept={subForm.mediaType === 'video' ? 'video/*' : 'audio/*'} className="hidden" onChange={e => setSubForm(f => ({...f, mediaFile: e.target.files?.[0] || null}))} />
                  </div>
                </div>

                {/* Pipeline explanation */}
                <div className="bg-[#9D4EDD]/5 border border-[#9D4EDD]/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-[#9D4EDD] mb-2">Submission Pipeline</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {['Upload', '→', 'AI Review', '→', 'Admin Approval', '→', 'Public Vote'].map((step, i) => (
                      <span key={i} className={step === '→' ? 'text-gray-600' : 'bg-white/5 px-2 py-0.5 rounded'}>{step}</span>
                    ))}
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={subSubmitting || !subForm.title || !subForm.competitionId || !subForm.mediaFile} className="w-full py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl font-medium disabled:opacity-40 transition-opacity">
                  {subSubmitting ? 'Submitting…' : 'Submit Entry'}
                </button>
              </div>
            ) : (
              <div className="bg-white/5 border border-[#9D4EDD]/20 rounded-2xl p-10 text-center">
                <div className="text-5xl mb-4">🎤</div>
                <h3 className="text-xl font-bold text-white mb-2">Entry Submitted!</h3>
                <p className="text-gray-400 mb-6">Your entry is in the review queue. We'll notify you when it goes live for public voting.</p>
                <button onClick={() => { setSubSuccess(false); setSubForm({competitionId:'', title:'', mediaType:'audio', mediaFile:null}); }} className="px-6 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors text-sm">Submit Another</button>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
