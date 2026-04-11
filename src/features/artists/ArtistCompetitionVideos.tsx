import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, ThumbsUp, Cpu, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── ArtistCompetitionVideos ───────────────────────────────────────────────────
// Grid of competition entry video cards. Fetches from competition_entries_v2
// where user_id = userId prop (falls back to artistId if userId not passed).

interface ArtistCompetitionVideosProps {
  artistId: string;
  userId?: string;
}

interface CompetitionEntry {
  id: string;
  title: string;
  thumbnail_url: string | null;
  votes_count: number;
  ai_score: number | null;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── StatusBadge ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  live:           { label: 'Live',     color: '#00F5A0' },
  winner:         { label: 'Winner',   color: '#FFB800' },
  pending:        { label: 'Pending',  color: '#9ca3af' },
  pending_review: { label: 'Pending',  color: '#9ca3af' },
  eliminated:     { label: 'Eliminated', color: '#FF6B00' },
  submitted:      { label: 'Submitted', color: '#00D9FF' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: '#9ca3af' };
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: `${s.color}22`,
        color: s.color,
        border: `1px solid ${s.color}44`,
      }}
    >
      {s.label}
    </span>
  );
}

// ── Thumbnail placeholder ──────────────────────────────────────────────────

function ThumbnailPlaceholder() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1a0a2e 0%, #0d1f40 55%, #120825 100%)',
      }}
    >
      <Video size={36} style={{ color: '#9D4EDD', opacity: 0.55 }} />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function ArtistCompetitionVideos({ artistId, userId }: ArtistCompetitionVideosProps) {
  // Use the passed userId; fall back to artistId as the user identifier
  const resolvedUserId = userId ?? artistId;

  const [entries, setEntries] = useState<CompetitionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resolvedUserId) return;
    setLoading(true);
    setError('');

    supabase
      .from('competition_entries_v2')
      .select('id, title, thumbnail_url, votes_count, ai_score, status')
      .eq('user_id', resolvedUserId)
      .order('votes_count', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) {
          console.error('ArtistCompetitionVideos:', err);
          setError(err.message);
        } else {
          setEntries((data ?? []) as CompetitionEntry[]);
        }
        setLoading(false);
      });
  }, [resolvedUserId]);

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={30} className="animate-spin" style={{ color: '#9D4EDD' }} />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(157,78,221,0.12)' }}
        >
          <Video size={26} style={{ color: '#9D4EDD' }} />
        </div>
        <p className="text-gray-400 text-sm">No competition entries yet.</p>
      </div>
    );
  }

  // ── Grid ───────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          to={`/competition/watch/${entry.id}`}
          className="group block rounded-2xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl"
          style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden">
            {entry.thumbnail_url ? (
              <img
                src={entry.thumbnail_url}
                alt={entry.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <ThumbnailPlaceholder />
            )}

            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }}
            />

            {/* Status badge top-right */}
            <div className="absolute top-2 right-2">
              <StatusBadge status={entry.status} />
            </div>

            {/* Votes badge top-left */}
            <div
              className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#00D9FF', backdropFilter: 'blur(4px)' }}
            >
              <ThumbsUp size={11} />
              {formatNumber(entry.votes_count ?? 0)}
            </div>
          </div>

          {/* Card body */}
          <div className="p-4 space-y-2">
            <p className="font-semibold text-sm text-white truncate leading-snug">
              {entry.title || 'Untitled Entry'}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {formatNumber(entry.votes_count ?? 0)} votes
              </span>
              {entry.ai_score != null && (
                <div className="flex items-center gap-1" style={{ color: '#00F5A0' }}>
                  <Cpu size={12} />
                  <span className="text-xs font-semibold">
                    AI {entry.ai_score.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default ArtistCompetitionVideos;
