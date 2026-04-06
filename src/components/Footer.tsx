import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="text-white font-bold text-lg">WANKONG</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              The creator platform for African music, books, videos & podcasts. Built for creators worldwide.
            </p>
            <div className="flex items-center gap-3">
              {['twitter', 'instagram', 'youtube', 'facebook'].map(s => (
                <a key={s} href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors capitalize text-xs">
                  {s[0].toUpperCase()}
                </a>
              ))}
            </div>
          </div>

          {/* Browse */}
          <div>
            <h4 className="text-white font-semibold mb-4">Browse</h4>
            <ul className="space-y-2">
              {[
                { label: 'Music', href: '/collections/music' },
                { label: 'Videos', href: '/collections/videos' },
                { label: 'Books', href: '/collections/books' },
                { label: 'Podcasts', href: '/collections/podcasts' },
                { label: 'Talent Arena', href: '/collections/talent-arena' },
                { label: 'Trending', href: '/collections/trending' },
                { label: 'Languages', href: '/collections/languages' },
              ].map(l => (
                <li key={l.label}><Link to={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* For Creators */}
          <div>
            <h4 className="text-white font-semibold mb-4">For Creators</h4>
            <ul className="space-y-2">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Upload Content', href: '/book-upload' },
                { label: 'Competitions', href: '/collections/competitions' },
                { label: 'Analytics', href: '/dashboard' },
                { label: 'Wallet', href: '/dashboard' },
              ].map(l => (
                <li key={l.label}><Link to={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Distribution */}
          <div>
            <h4 className="text-white font-semibold mb-4">Distribution</h4>
            <ul className="space-y-2">
              {['Spotify', 'Apple Music', 'YouTube Music', 'TikTok', 'Amazon Music', 'Deezer', 'Tidal'].map(p => (
                <li key={p}><span className="text-sm text-gray-400">{p}</span></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {['About', 'Careers', 'Blog', 'Press', 'Contact', 'Privacy Policy', 'Terms of Service'].map(item => (
                <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2026 WANKONG. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Payments powered by:</span>
            {['Stripe', 'M-Pesa', 'MTN MoMo', 'Orange'].map(p => (
              <span key={p} className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
