import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Music, Upload, Radio, Trophy, DollarSign,
  Users, TrendingUp, Settings, Play, BarChart2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Stats {
  tracks:      number;
  streams:     bigint | number;
  followers:   number;
  earnings:    number;
  releases:    number;
  competitions: number;
}

interface RecentTrack {
  id: string;
  title: string;
  stream_count: number;
  created_at: string;
  language?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0A1128';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, colour, sub,
}: { icon: React.ReactNode; label: string; value: string; colour: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: `${colour}08`, borderColor: `${colour}22` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${colour}18`, color: colour }}
        >
          {icon}
        </div>
      </div>
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="text-white font-black text-2xl" style={{ color: colour }}>{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ── Quick action ───────────────────────────────────────────────────────────────

function QuickAction({ icon, label, href, colour }: { icon: React.ReactNode; label: string; href: string; colour: string }) {
  return (
    <Link
      to={href}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all text-center"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: `${colour}18`, color: colour }}
      >
        {icon}
      </div>
      <span className="text-white/70 text-xs font-medium leading-tight">{label}</span>
    </Link>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ArtistDashboardPage() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const [stats,        setStats]        = useState<Stats | null>(null);
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([]);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const uid = user.id;
    const [tracksRes, streamsRes, followersRes, earningsRes, releasesRes, compRes] = await Promise.all([
      supabase.from('tracks').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('tracks').select('stream_count').eq('user_id', uid),
      supabase.from('artist_followers').select('*', { count: 'exact', head: true }).eq('artist_id', uid),
      supabase.from('creator_earnings').select('amount').eq('user_id', uid),
      supabase.from('distribution_releases').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('competition_entries_v2').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    ]);

    const totalStreams = (streamsRes.data ?? []).reduce((s: number, r: { stream_count: number }) => s + (r.stream_count ?? 0), 0);
    const totalEarned  = (earningsRes.data ?? []).reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0);

    setStats({
      tracks:       tracksRes.count   ?? 0,
      streams:      totalStreams,
      followers:    followersRes.count ?? 0,
      earnings:     totalEarned,
      releases:     releasesRes.count ?? 0,
      competitions: compRes.count     ?? 0,
    });

    const { data: recent } = await supabase
      .from('tracks')
      .select('id,title,stream_count,created_at,language')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentTracks((recent ?? []) as RecentTrack[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) { navigate('/', { replace: true }); return null; }

  const fmtNum  = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="min-h-screen text-white" style={{ background: NAVY }}>
      <Header />

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">

        {/* Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${CYAN}18`, color: CYAN }}>
                Artist Dashboard
              </span>
            </div>
            <h1 className="text-3xl font-black text-white">
              Welcome back, {user.email?.split('@')[0]}
            </h1>
            <p className="text-white/40 text-sm mt-1">Manage your music, releases & earnings</p>
          </div>
          <Link
            to="/upload/distribute"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}
          >
            <Upload className="w-4 h-4" />
            Upload Music
          </Link>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl h-32 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard icon={<Music className="w-5 h-5" />}      label="Tracks"       value={fmtNum(stats.tracks)}      colour={CYAN}   />
            <StatCard icon={<Play className="w-5 h-5" />}       label="Total Streams" value={fmtNum(Number(stats.streams))} colour={PURPLE} />
            <StatCard icon={<Users className="w-5 h-5" />}      label="Followers"    value={fmtNum(stats.followers)}   colour={GREEN}  />
            <StatCard icon={<DollarSign className="w-5 h-5" />} label="Earnings"     value={fmtMoney(stats.earnings)}  colour={GOLD}   />
            <StatCard icon={<Radio className="w-5 h-5" />}      label="Releases"     value={String(stats.releases)}    colour={ORANGE} />
            <StatCard icon={<Trophy className="w-5 h-5" />}     label="Competitions" value={String(stats.competitions)} colour={PURPLE} />
          </div>
        )}

        {/* Two-col: quick actions + recent tracks */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Quick actions */}
          <div>
            <h2 className="text-white font-bold text-base mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction icon={<Upload className="w-5 h-5" />}    label="Distribute Release"    href="/upload/distribute"       colour={CYAN}   />
              <QuickAction icon={<Trophy className="w-5 h-5" />}    label="Enter Competition"      href="/talent-arena/upload"     colour={PURPLE} />
              <QuickAction icon={<Radio className="w-5 h-5" />}     label="My Releases"            href="/distribution/releases"  colour={ORANGE} />
              <QuickAction icon={<DollarSign className="w-5 h-5" />} label="Earnings"              href="/dashboard/earnings"      colour={GOLD}   />
              <QuickAction icon={<TrendingUp className="w-5 h-5" />} label="Talent Arena"          href="/talent-arena"            colour={GREEN}  />
              <QuickAction icon={<BarChart2 className="w-5 h-5" />} label="Analytics"              href="/dashboard"               colour={CYAN}   />
            </div>
          </div>

          {/* Recent tracks */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">Recent Tracks</h2>
              <Link to="/dashboard" className="text-xs" style={{ color: CYAN }}>View all →</Link>
            </div>

            {recentTracks.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/3 p-10 text-center">
                <p className="text-4xl mb-3">🎵</p>
                <p className="text-white/50 text-sm mb-4">No tracks uploaded yet</p>
                <Link
                  to="/upload/distribute"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}
                >
                  Upload Your First Track
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTracks.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: `${PURPLE}20`, color: PURPLE }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{t.title}</p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {t.language && ` · ${t.language.toUpperCase()}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ color: CYAN }}>
                        {fmtNum(t.stream_count)}
                      </p>
                      <p className="text-white/30 text-xs">streams</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Creator tools strip */}
        <div className="mt-8 rounded-2xl p-5 border border-white/8 bg-white/3">
          <h2 className="text-white font-bold text-sm mb-4">Creator Tools</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Distribution Guide',     href: '/distribution-agreement' },
              { label: 'Competition Rules',       href: '/competition-terms'      },
              { label: 'Creator Monetization',    href: '/creator-monetization-policy' },
              { label: 'Help Center',             href: '/help'                   },
            ].map(l => (
              <Link
                key={l.label}
                to={l.href}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
