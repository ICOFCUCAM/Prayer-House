import React, { useEffect, useState } from 'react';
import { Music2, Radio, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── ArtistReleasesList ────────────────────────────────────────────────────────
// Dark-theme list of an artist's tracks queried from 'tracks' where
// user_id = artistId, ordered by created_at desc. Shows cover art placeholder,
// title, genre, stream_count, and date.

interface ArtistReleasesListProps {
  artistId: string;
}

interface Track {
  id: string;
  title: string;
  cover_url: string | null;
  genre: string | null;
  stream_count: number;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatStreams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── CoverPlaceholder ───────────────────────────────────────────────────────

function CoverPlaceholder({ title }: { title: string }) {
  const initials = title.charAt(0).toUpperCase();
  return (
    <div
      className="w-full h-full flex items-center justify-center text-lg font-bold"
      style={{
        background: 'linear-gradient(135deg, #9D4EDD44 0%, #00D9FF22 100%)',
        color: '#9D4EDD',
      }}
    >
      {initials}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function ArtistReleasesList({ artistId }: ArtistReleasesListProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!artistId) return;
    setLoading(true);
    setError('');

    supabase
      .from('tracks')
      .select('id, title, cover_url, genre, stream_count, created_at')
      .eq('user_id', artistId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => {
        if (err) {
          console.error('ArtistReleasesList:', err);
          setError(err.message);
        } else {
          setTracks((data ?? []) as Track[]);
        }
        setLoading(false);
      });
  }, [artistId]);

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="animate-spin" style={{ color: '#00D9FF' }} />
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

  if (tracks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(0,217,255,0.1)' }}
        >
          <Music2 size={26} style={{ color: '#00D9FF' }} />
        </div>
        <p className="text-gray-400 text-sm">No releases yet.</p>
      </div>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-1">
      {tracks.map((track, i) => (
        <div
          key={track.id}
          className="flex items-center gap-4 px-3 py-3 rounded-xl transition-colors hover:bg-white/5 group"
        >
          {/* Row index */}
          <span className="w-5 text-right text-gray-600 text-sm shrink-0 group-hover:text-gray-400 transition-colors select-none">
            {i + 1}
          </span>

          {/* Cover art / placeholder */}
          <div
            className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
            style={{ background: '#111827' }}
          >
            {track.cover_url ? (
              <img
                src={track.cover_url}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <CoverPlaceholder title={track.title} />
            )}
          </div>

          {/* Title & genre */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-white truncate">{track.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{track.genre ?? 'Unknown genre'}</p>
          </div>

          {/* Date — hidden on small screens */}
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-xs text-gray-500">{formatDate(track.created_at)}</p>
          </div>

          {/* Stream count */}
          <div className="text-right shrink-0 min-w-[56px]">
            <p className="text-sm font-semibold" style={{ color: '#FFB800' }}>
              {formatStreams(track.stream_count ?? 0)}
            </p>
            <div className="flex items-center justify-end gap-0.5 mt-0.5">
              <Radio size={9} style={{ color: '#6b7280' }} />
              <span className="text-xs text-gray-600">streams</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ArtistReleasesList;
