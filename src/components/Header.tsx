import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useApp } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import { SUPPORTED_LANGUAGES, applyLangDir } from '@/lib/i18n';

// ── Language Switcher ─────────────────────────────────────────────────────────

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language.slice(0, 2))
    ?? SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    applyLangDir(code);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-white transition-colors text-xs font-medium rounded-lg hover:bg-gray-800"
        title="Select language"
        aria-label="Language selector"
      >
        {/* Globe icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline uppercase">{current.code}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-800 transition-colors ${
                lang.code === current.code ? 'text-indigo-400 font-semibold' : 'text-gray-300'
              }`}
            >
              <span>{lang.nativeLabel}</span>
              <span className="text-gray-500">{lang.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nav links (label keys map to i18n translation keys) ──────────────────────

const NAV_ITEMS: Array<{ key: string; href?: string; handle?: string }> = [
  { key: 'nav.home',        href:   '/'                   },
  { key: 'nav.music',       handle: 'music'               },
  { key: 'nav.videos',      handle: 'videos'              },
  { key: 'nav.books',       handle: 'books'               },
  { key: 'nav.audiobooks',  handle: 'audiobooks'          },
  { key: 'nav.podcasts',    handle: 'podcasts'            },
  { key: 'nav.talentArena', handle: 'talent-arena'        },
  { key: 'nav.marketplace', handle: 'marketplace'         },
  { key: 'nav.competitions',handle: 'competitions'        },
  { key: 'nav.languages',   handle: 'languages'           },
  { key: 'nav.artists',     handle: 'artists'             },
];

// ── Notification Bell ─────────────────────────────────────────────────────────

interface Notification {
  id:         string;
  title:      string;
  body:       string;
  read:       boolean;
  created_at: string;
  link?:      string;
}

function NotificationBell({ userId }: { userId?: string }) {
  const [notifs,  setNotifs]  = useState<Notification[]>([]);
  const [open,    setOpen]    = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifs((data ?? []) as Notification[]);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    setNotifs(n => n.map(x => ({ ...x, read: true })));
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  if (!userId) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF006E] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-white font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {notifs.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id}
                  className={`flex gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-0 ${!n.read ? 'bg-indigo-950/20' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-gray-700' : 'bg-indigo-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium">{n.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                  <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Header Component ──────────────────────────────────────────────────────────

export default function Header() {
  const { t } = useTranslation();
  const { cartCount } = useCart();
  const { isAuthenticated } = useApp();
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled,       setScrolled]       = useState(false);
  const [currentUserId,  setCurrentUserId]  = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id));
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center text-xs py-2 px-4">
        🎵 New: Global Music Distribution to 30+ platforms — <Link to="/dashboard" className="underline font-medium">Start distributing →</Link>
      </div>

      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-gray-950/95 backdrop-blur-xl shadow-lg shadow-black/20' : 'bg-gray-950/80 backdrop-blur-md'} border-b border-gray-800/50`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="text-white font-bold text-lg hidden sm:block">WANKONG</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden xl:flex items-center gap-1 overflow-x-auto flex-1 mx-4">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href ?? item.handle}
                  to={item.href ?? `/collections/${item.handle}`}
                  className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* Search */}
              <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Cart */}
              <Link to="/cart" className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Notification bell */}
              {isAuthenticated && <NotificationBell userId={currentUserId} />}

              {/* Language switcher */}
              <LanguageSwitcher />

              {/* Auth buttons */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    {t('nav.dashboard')}
                  </Link>
                  <button onClick={handleSignOut} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                    {t('nav.signOut')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate('/auth/login')} className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors hidden sm:block">
                    {t('nav.signIn')}
                  </button>
                  <button onClick={() => navigate('/auth/register')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                    {t('nav.getStarted')}
                  </button>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="xl:hidden p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Search bar */}
          {searchOpen && (
            <form onSubmit={handleSearch} className="pb-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('common.search') + ' music, books, videos, artists...'}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </form>
          )}
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-gray-800 bg-gray-950">
            <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href ?? item.handle}
                  to={item.href ?? `/collections/${item.handle}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {t(item.key)}
                </Link>
              ))}
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-gray-800 rounded-lg transition-colors">
                {t('nav.dashboard')}
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
