import React, { useState } from 'react';
import { Music, BookOpen, Users, Check } from 'lucide-react';
import type { UserRole } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RoleCard {
  role:        UserRole;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  perks:       string[];
  colour:      string;
  gradient:    string;
}

interface Props {
  onSelect:  (role: UserRole) => void;
  loading?:  boolean;
  ctaLabel?: string;
}

// ── Role definitions ───────────────────────────────────────────────────────────

const ROLES: RoleCard[] = [
  {
    role:        'artist',
    label:       'Artist',
    description: 'Upload music, compete in talent arenas, distribute globally',
    icon:        <Music className="w-7 h-7" />,
    perks: [
      'Upload & distribute music worldwide',
      'Enter talent competitions',
      'Earn from streams & royalties',
      'Canvas artwork & motion visuals',
    ],
    colour:   '#00D9FF',
    gradient: 'from-[#00D9FF]/20 to-[#9D4EDD]/10',
  },
  {
    role:        'author',
    label:       'Author',
    description: 'Publish books, audiobooks, and auto-translate to 16 languages',
    icon:        <BookOpen className="w-7 h-7" />,
    perks: [
      'Publish books & audiobooks',
      'Auto-translate to 16 languages',
      'Earn from sales & royalties',
      'Author analytics dashboard',
    ],
    colour:   '#FFB800',
    gradient: 'from-[#FFB800]/20 to-[#FF6B00]/10',
  },
  {
    role:        'fan',
    label:       'Fan',
    description: 'Discover content, vote in competitions, follow your favourites',
    icon:        <Users className="w-7 h-7" />,
    perks: [
      'Unlimited music & content discovery',
      'Vote in talent arena competitions',
      'Follow artists & authors',
      'Save favourites to your library',
    ],
    colour:   '#00F5A0',
    gradient: 'from-[#00F5A0]/20 to-[#00D9FF]/10',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function RoleSelector({ onSelect, loading = false, ctaLabel = 'Continue' }: Props) {
  const [selected, setSelected] = useState<UserRole | null>(null);

  return (
    <div className="w-full">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {ROLES.map(r => {
          const isActive = selected === r.role;
          return (
            <button
              key={r.role}
              onClick={() => setSelected(r.role)}
              className={`relative text-left rounded-2xl p-5 border-2 transition-all duration-200 focus:outline-none ${
                isActive
                  ? 'border-[#9D4EDD] bg-[#9D4EDD]/10 shadow-[0_0_24px_rgba(157,78,221,0.35)]'
                  : 'border-white/10 bg-white/3 hover:border-white/25 hover:bg-white/5'
              }`}
            >
              {/* Selected check */}
              {isActive && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#9D4EDD] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center mb-4`}
                style={{ color: r.colour }}
              >
                {r.icon}
              </div>

              {/* Label */}
              <h3 className="text-white font-bold text-lg mb-1">{r.label}</h3>
              <p className="text-white/50 text-sm mb-4 leading-relaxed">{r.description}</p>

              {/* Perks */}
              <ul className="space-y-2">
                {r.perks.map(perk => (
                  <li key={perk} className="flex items-start gap-2 text-xs text-white/60">
                    <span style={{ color: r.colour }} className="mt-0.5 text-xs">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected || loading}
        className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white hover:opacity-90"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving…
          </span>
        ) : (
          ctaLabel
        )}
      </button>
    </div>
  );
}
