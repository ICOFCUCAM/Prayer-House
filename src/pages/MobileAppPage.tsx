import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const FEATURES = [
  {
    icon: '🎵',
    title: 'Offline Listening',
    description: 'Download music, audiobooks, and podcasts for uninterrupted listening without an internet connection.',
  },
  {
    icon: '📱',
    title: 'Mini Player',
    description: 'A persistent mini player keeps your track playing while you browse the rest of the app — seamlessly.',
  },
  {
    icon: '🔔',
    title: 'Smart Notifications',
    description: 'Get notified when artists you follow drop new music, when competition results are announced, or when you have earnings to review.',
  },
  {
    icon: '🏆',
    title: 'Talent Arena on Mobile',
    description: 'Vote in competitions, watch entries, and submit your own competition clips directly from your phone.',
  },
  {
    icon: '📚',
    title: 'eBook Reader',
    description: 'A built-in reader with adjustable font size, dark mode, bookmarks, and progress synced across all your devices.',
  },
  {
    icon: '💸',
    title: 'Creator Dashboard',
    description: 'Track your streams, sales, and earnings in real time — including competition prize statuses — from your pocket.',
  },
];

const PLATFORMS = [
  {
    name: 'iOS',
    subtitle: 'iPhone & iPad',
    color: '#00D9FF',
    icon: '🍎',
    badge: 'App Store',
    href: '#',
    requirement: 'Requires iOS 15.0 or later',
  },
  {
    name: 'Android',
    subtitle: 'Phone & Tablet',
    color: '#00F5A0',
    icon: '🤖',
    badge: 'Google Play',
    href: '#',
    requirement: 'Requires Android 8.0 or later',
  },
];

export default function MobileAppPage() {
  return (
    <div className="min-h-screen bg-[#0A1128]">
      <Header />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-6">
          Mobile App
        </div>
        <h1 className="text-5xl font-black text-white mb-4">
          WANKONG in your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD]">pocket</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
          Stream music, read eBooks, listen to podcasts, compete in Talent Arena, and manage your creator earnings — all from the WANKONG mobile app.
        </p>

        {/* Platform cards */}
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          {PLATFORMS.map(p => (
            <a
              key={p.name}
              href={p.href}
              className="flex items-center gap-4 bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl px-6 py-4 transition-all group"
            >
              <span className="text-3xl">{p.icon}</span>
              <div className="text-left">
                <div className="text-white font-semibold text-sm">{p.badge}</div>
                <div className="text-gray-400 text-xs">{p.name} · {p.subtitle}</div>
                <div className="text-gray-500 text-xs mt-0.5">{p.requirement}</div>
              </div>
              <div
                className="ml-2 px-3 py-1 rounded-lg text-xs font-bold"
                style={{ backgroundColor: `${p.color}15`, color: p.color }}
              >
                Download
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Everything you need, mobile-first</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-2">{f.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coming soon note */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 pb-20">
        <div className="bg-[#00D9FF]/5 border border-[#00D9FF]/20 rounded-2xl p-6 text-center">
          <p className="text-gray-300 text-sm">
            The WANKONG mobile app is currently in beta. Join the waitlist to get early access.
          </p>
          <a
            href="mailto:mobile@wankong.com?subject=Mobile Beta Waitlist"
            className="inline-flex mt-4 px-6 py-2.5 bg-[#00D9FF] text-[#0A1128] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Join the Beta Waitlist
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
