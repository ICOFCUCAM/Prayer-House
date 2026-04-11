import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Music, BookOpen, Trophy, Radio,
  DollarSign, AlertTriangle, Settings, BarChart2,
  ChevronRight, Shield, LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SidebarItem {
  path:  string;
  label: string;
  icon:  React.ReactNode;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0A1128';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';
const RED    = '#EF4444';

const NAV: SidebarItem[] = [
  { path: '/admin',               label: 'Overview',      icon: <BarChart2 className="w-4 h-4" /> },
  { path: '/admin/users',         label: 'Users',         icon: <Users className="w-4 h-4" /> },
  { path: '/admin/artists',       label: 'Artists',       icon: <Music className="w-4 h-4" /> },
  { path: '/admin/authors',       label: 'Authors',       icon: <BookOpen className="w-4 h-4" /> },
  { path: '/admin/competitions',  label: 'Competitions',  icon: <Trophy className="w-4 h-4" /> },
  { path: '/admin/distribution',  label: 'Distribution',  icon: <Radio className="w-4 h-4" /> },
  { path: '/admin/books',         label: 'Books',         icon: <BookOpen className="w-4 h-4" /> },
  { path: '/admin/earnings',      label: 'Earnings',      icon: <DollarSign className="w-4 h-4" /> },
  { path: '/admin/reports',       label: 'Reports',       icon: <AlertTriangle className="w-4 h-4" /> },
  { path: '/admin/settings',      label: 'Settings',      icon: <Settings className="w-4 h-4" /> },
];

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, colour, icon }: {
  label: string; value: string | number; colour: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: `${colour}08`, borderColor: `${colour}20` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${colour}18`, color: colour }}>
          {icon}
        </div>
      </div>
      <p className="text-white/40 text-xs">{label}</p>
      <p className="text-xl font-black" style={{ color: colour }}>{value}</p>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────────

function Overview() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('tracks').select('*', { count: 'exact', head: true }),
      supabase.from('ecom_products').select('*', { count: 'exact', head: true }).eq('product_type', 'Book'),
      supabase.from('audiobooks').select('*', { count: 'exact', head: true }),
      supabase.from('competition_entries_v2').select('*', { count: 'exact', head: true }),
      supabase.from('distribution_releases').select('*', { count: 'exact', head: true }),
    ]).then(([users, tracks, books, audio, comps, releases]) => {
      setCounts({
        users:    users.count    ?? 0,
        tracks:   tracks.count   ?? 0,
        books:    books.count    ?? 0,
        audio:    audio.count    ?? 0,
        comps:    comps.count    ?? 0,
        releases: releases.count ?? 0,
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}</div>;

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-6">Platform Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Users"      value={counts.users}    colour={CYAN}   icon={<Users className="w-4 h-4" />} />
        <StatCard label="Tracks"           value={counts.tracks}   colour={PURPLE} icon={<Music className="w-4 h-4" />} />
        <StatCard label="Books"            value={counts.books}    colour={GOLD}   icon={<BookOpen className="w-4 h-4" />} />
        <StatCard label="Audiobooks"       value={counts.audio}    colour={GREEN}  icon={<BookOpen className="w-4 h-4" />} />
        <StatCard label="Competition Entries" value={counts.comps} colour={ORANGE} icon={<Trophy className="w-4 h-4" />} />
        <StatCard label="Releases"         value={counts.releases} colour={RED}    icon={<Radio className="w-4 h-4" />} />
      </div>

      {/* Quick links */}
      <h3 className="text-white/60 font-semibold text-sm mb-3 uppercase tracking-wider">Quick Access</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {NAV.slice(1).map(n => (
          <Link
            key={n.path}
            to={n.path}
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-white/40">{n.icon}</span>
              <span className="text-white/70 text-sm font-medium">{n.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────────

function AdminUsers() {
  const [rows,    setRows]    = useState<{ id: string; email?: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRows((data ?? []) as { id: string; email?: string; created_at: string }[]);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-6">Users</h2>
      {loading ? <p className="text-white/40">Loading…</p> : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `${CYAN}20`, color: CYAN }}>
                {r.id.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{(r as { display_name?: string }).display_name ?? r.id.slice(0, 12) + '…'}</p>
                <p className="text-white/30 text-xs">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Generic table module ───────────────────────────────────────────────────────

function GenericModule({
  title, table, select, columns, colour,
}: {
  title: string;
  table: string;
  select: string;
  columns: { key: string; label: string }[];
  colour: string;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from(table as 'tracks')
      .select(select)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRows((data ?? []) as Record<string, unknown>[]);
        setLoading(false);
      });
  }, [table, select]);

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-6">{title}</h2>
      {loading ? <p className="text-white/40">Loading…</p> : rows.length === 0 ? (
        <div className="text-center py-16 text-white/30">No data yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {columns.map(c => (
                  <th key={c.key} className="text-left text-white/40 font-semibold py-2 pr-4 text-xs uppercase tracking-wide">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  {columns.map(c => (
                    <td key={c.key} className="py-3 pr-4 text-white/70 truncate max-w-[180px]">
                      {String(row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────────

function AdminSettings() {
  return (
    <div>
      <h2 className="text-white font-black text-xl mb-6">Admin Settings</h2>
      <div className="space-y-4">
        {[
          { label: 'Platform Mode', value: 'Production' },
          { label: 'Maintenance Mode', value: 'Off' },
          { label: 'New User Registrations', value: 'Enabled' },
          { label: 'Competition Voting', value: 'Enabled' },
          { label: 'Distribution Queue', value: 'Active' },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between px-4 py-4 rounded-xl border border-white/8 bg-white/3">
            <span className="text-white/70 text-sm">{s.label}</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${GREEN}15`, color: GREEN }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  const location = useLocation();

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/8" style={{ background: '#07091A' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/8">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}>
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-black text-base">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
        {NAV.map(n => {
          const active = location.pathname === n.path ||
            (n.path !== '/admin' && location.pathname.startsWith(n.path));
          return (
            <Link
              key={n.path}
              to={n.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {n.icon}
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/8 space-y-1">
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors">
          ← Back to Site
        </Link>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-white/50 mb-6">Admin access required.</p>
          <Link to="/" className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})`, color: '#fff' }}>
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex text-white" style={{ background: NAVY }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — desktop always visible, mobile toggled */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:flex lg:flex-shrink-0 transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar onSignOut={handleSignOut} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-white/8" style={{ background: 'rgba(10,17,40,0.85)', backdropFilter: 'blur(12px)' }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 text-white/40 hover:text-white transition-colors"
          >
            ☰
          </button>
          <div className="flex-1" />
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${RED}15`, color: RED }}>
            Admin Panel
          </span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${PURPLE}30`, color: PURPLE }}>
            {user.email?.[0].toUpperCase()}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/"            element={<Overview />} />
            <Route path="/users"       element={<AdminUsers />} />
            <Route path="/artists"     element={<GenericModule title="Artists" table="artists" select="id,name,slug,verified,streams,followers,created_at" columns={[{ key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }, { key: 'streams', label: 'Streams' }, { key: 'followers', label: 'Followers' }, { key: 'verified', label: 'Verified' }]} colour={CYAN} />} />
            <Route path="/authors"     element={<GenericModule title="Authors" table="authors" select="id,name,slug,total_downloads,total_earnings,created_at" columns={[{ key: 'name', label: 'Name' }, { key: 'total_downloads', label: 'Downloads' }, { key: 'total_earnings', label: 'Earnings' }]} colour={GOLD} />} />
            <Route path="/competitions" element={<GenericModule title="Competitions" table="competition_rooms" select="id,title,status,prize_pool,entry_count,created_at" columns={[{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }, { key: 'prize_pool', label: 'Prize Pool' }, { key: 'entry_count', label: 'Entries' }]} colour={PURPLE} />} />
            <Route path="/distribution" element={<GenericModule title="Distribution Releases" table="distribution_releases" select="id,status,created_at" columns={[{ key: 'id', label: 'ID' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Created' }]} colour={ORANGE} />} />
            <Route path="/books"       element={<GenericModule title="Books" table="ecom_products" select="id,title,price,language,created_at" columns={[{ key: 'title', label: 'Title' }, { key: 'price', label: 'Price' }, { key: 'language', label: 'Lang' }, { key: 'created_at', label: 'Created' }]} colour={GOLD} />} />
            <Route path="/earnings"    element={<GenericModule title="Earnings" table="creator_earnings" select="id,user_id,category,amount,created_at" columns={[{ key: 'user_id', label: 'User' }, { key: 'category', label: 'Category' }, { key: 'amount', label: 'Amount' }, { key: 'created_at', label: 'Date' }]} colour={GREEN} />} />
            <Route path="/reports"     element={<GenericModule title="Reports" table="content_reports" select="id,reason,status,created_at" columns={[{ key: 'id', label: 'ID' }, { key: 'reason', label: 'Reason' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Date' }]} colour={RED} />} />
            <Route path="/settings"    element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
