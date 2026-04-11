import React from 'react';
import { Star, Zap, Crown } from 'lucide-react';
import type { CreatorLevel } from './CreatorLevelService';

// ── CreatorLevelBadge ─────────────────────────────────────────
// Visual badge for creator levels. Sizes: sm | md | lg.

interface CreatorLevelBadgeProps {
  level: CreatorLevel;
  size?: 'sm' | 'md' | 'lg';
}

interface LevelStyle {
  color: string;
  gradient: string | null;
  bg: string;
  ring: string;
}

const LEVEL_STYLES: Record<CreatorLevel, LevelStyle> = {
  Bronze: {
    color: '#CD7F32',
    gradient: null,
    bg: 'rgba(205,127,50,0.12)',
    ring: 'rgba(205,127,50,0.4)',
  },
  Silver: {
    color: '#C0C0C0',
    gradient: null,
    bg: 'rgba(192,192,192,0.12)',
    ring: 'rgba(192,192,192,0.4)',
  },
  Gold: {
    color: '#FFB800',
    gradient: null,
    bg: 'rgba(255,184,0,0.12)',
    ring: 'rgba(255,184,0,0.4)',
  },
  Platinum: {
    color: '#E5E4E2',
    gradient: null,
    bg: 'rgba(229,228,226,0.12)',
    ring: 'rgba(229,228,226,0.4)',
  },
  Diamond: {
    color: '#00D9FF',
    gradient: null,
    bg: 'rgba(0,217,255,0.12)',
    ring: 'rgba(0,217,255,0.4)',
  },
  GlobalAmbassador: {
    color: '#FFB800',
    gradient: 'linear-gradient(135deg, #9D4EDD 0%, #FFB800 100%)',
    bg: 'rgba(157,78,221,0.15)',
    ring: 'rgba(157,78,221,0.5)',
  },
};

function LevelIcon({ level, size }: { level: CreatorLevel; size: number }) {
  const props = { size, strokeWidth: 1.8 };
  if (level === 'Diamond' || level === 'GlobalAmbassador') return <Crown {...props} />;
  if (level === 'Gold' || level === 'Platinum') return <Star {...props} />;
  return <Zap {...props} />;
}

export function CreatorLevelBadge({ level, size = 'md' }: CreatorLevelBadgeProps) {
  const style = LEVEL_STYLES[level];

  // ── SM: compact pill ─────────────────────────────────────────
  if (size === 'sm') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold select-none"
        style={{
          background: style.bg,
          border: `1px solid ${style.ring}`,
          color: style.gradient ? 'transparent' : style.color,
          backgroundImage: style.gradient
            ? `${style.gradient}, ${style.bg}`
            : undefined,
          WebkitBackgroundClip: style.gradient ? 'text' : undefined,
          WebkitTextFillColor: style.gradient ? 'transparent' : undefined,
        }}
      >
        {level === 'GlobalAmbassador' ? 'Ambassador' : level}
      </span>
    );
  }

  // ── MD: badge with icon ring ──────────────────────────────────
  if (size === 'md') {
    return (
      <div className="inline-flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-full w-8 h-8 shrink-0"
          style={{
            background: style.bg,
            border: `2px solid ${style.ring}`,
            color: style.color,
          }}
        >
          <LevelIcon level={level} size={14} />
        </div>
        <span
          className="text-sm font-semibold"
          style={
            style.gradient
              ? {
                  background: style.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }
              : { color: style.color }
          }
        >
          {level === 'GlobalAmbassador' ? 'Global Ambassador' : level}
        </span>
      </div>
    );
  }

  // ── LG: large card with sparkle ───────────────────────────────
  return (
    <div
      className="relative inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl select-none overflow-hidden"
      style={{
        background: style.bg,
        border: `2px solid ${style.ring}`,
      }}
    >
      {/* Glow orb behind icon */}
      <div
        className="absolute inset-0 opacity-20 blur-2xl"
        style={{ background: style.gradient ?? style.color }}
      />
      {/* Icon ring */}
      <div
        className="relative flex items-center justify-center w-16 h-16 rounded-full z-10"
        style={{
          background: `radial-gradient(circle, ${style.bg} 60%, transparent 100%)`,
          border: `3px solid ${style.ring}`,
          color: style.color,
        }}
      >
        <LevelIcon level={level} size={28} />
        {/* Sparkle dots */}
        <Star
          size={8}
          className="absolute -top-1 -right-1 opacity-80"
          style={{ color: style.color }}
          fill={style.color}
        />
        <Star
          size={6}
          className="absolute -bottom-1 -left-1 opacity-60"
          style={{ color: style.color }}
          fill={style.color}
        />
      </div>
      {/* Level label */}
      <span
        className="relative z-10 text-xl font-bold tracking-wide"
        style={
          style.gradient
            ? {
                background: style.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }
            : { color: style.color }
        }
      >
        {level === 'GlobalAmbassador' ? 'Global Ambassador' : level}
      </span>
      <span className="relative z-10 text-xs text-gray-400 font-medium uppercase tracking-widest">
        Creator Level
      </span>
    </div>
  );
}
