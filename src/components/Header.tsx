import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useApp } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';

const NAV_LINKS: Array<{ label: string; href?: string; handle?: string }> = [
  { label: 'Homepage', href: '/' },
  { label: 'Music', handle: 'music' },
  { label: 'Videos', handle: 'videos' },
  { label: 'Books', handle: 'books' },
  { label: 'Podcasts', handle: 'podcasts' },
  { label: 'Talent Arena', handle: 'talent-arena' },
  { label: 'Marketplace', handle: 'marketplace' },
  { label: 'Competitions', handle: 'competitions' },
  { label: 'Languages', handle: 'languages' },
  { label: 'Artists', handle: 'artists' },
];

export default function Header() {
  const { cartCount } = useCart();
  const { isAuthenticated, setShowAuthModal, setAuthMode } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

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
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="text-white font-bold text-lg hidden sm:block">WANKONG</span>
            </Link>

            <nav className="hidden xl:flex items-center gap-1 overflow-x-auto flex-1 mx-4">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href ?? link.handle}
                  to={link.href ?? `/collections/${link.handle}`}
                  className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>

              <Link to="/cart" className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    Dashboard
                  </Link>
                  <button onClick={handleSignOut} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Sign out</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate('/auth/login')} className="px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors hidden sm:block">
                    Sign in
                  </button>
                  <button onClick={() => navigate('/auth/register')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                    Get Started
                  </button>
                </div>
              )}

              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="xl:hidden p-2 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>

          {searchOpen && (
            <form onSubmit={handleSearch} className="pb-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search music, books, videos, artists..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </form>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-gray-800 bg-gray-950">
            <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href ?? link.handle}
                  to={link.href ?? `/collections/${link.handle}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-gray-800 rounded-lg transition-colors">
                Dashboard
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
