import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Globe, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SocialVideoCard, { type VideoCard } from './SocialVideoCard';

// ── Env ────────────────────────────────────────────────────────────────────────

const YT_API_KEY    = import.meta.env.VITE_YOUTUBE_API_KEY    as string | undefined;
const YT_PLAYLIST   = import.meta.env.VITE_WANKONG_PLAYLIST_ID as string | undefined;
const GRID_VISIBLE  = 6;
const ROTATION_MS   = 8_000;

// ── Fallback static videos (shown when YouTube API unavailable) ───────────────

const FALLBACK_VIDEOS: VideoCard[] = [
  { id: 'fb1', videoId: 'YOUR_VIDEO_ID_1', title: 'Featured Performance — Week 1', thumbnail: 'gradient:from-[#9D4EDD] to-[#00D9FF]', platform: 'youtube', embedUrl: 'https://www.youtube.com/embed/YOUR_VIDEO_ID_1' },
  { id: 'fb2', videoId: 'YOUR_VIDEO_ID_2', title: 'Featured Performance — Week 2', thumbnail: 'gradient:from-[#FF6B00] to-[#FFB800]', platform: 'youtube', embedUrl: 'https://www.youtube.com/embed/YOUR_VIDEO_ID_2' },
  { id: 'fb3', videoId: 'YOUR_VIDEO_ID_3', title: 'Featured Performance — Week 3', thumbnail: 'gradient:from-[#00F5A0] to-[#00D9FF]', platform: 'youtube', embedUrl: 'https://www.youtube.com/embed/YOUR_VIDEO_ID_3' },
  { id: 'fb4', videoId: 'YOUR_VIDEO_ID_4', title: 'Featured Performance — Week 4', thumbnail: 'gradient:from-[#FFB800] to-[#FF6B00]', platform: 'youtube', embedUrl: 'https://www.youtube.com/embed/YOUR_VIDEO_ID_4' },
  { id: 'fb5', videoId: 'YOUR_VIDEO_ID_5', title: 'Featured Performance — Week 5', thumbnail: 'gradient:from-[#9D4EDD] to-[#FF6B00]', platform: 'youtube', embedUrl: 'https://www.youtube.com/embed/YOUR_VIDEO_ID_5' },
  { id: 'fb6', videoId: 'YOUR_VIDEO_ID_6', title: 'Featured Performance — Week 6', thumbnail: 'gradient:from-[#00D9FF] to-[#9D4EDD]', platform: 'youtube', embedUrl: 'https://www.youtube.com/embed/YOUR_VIDEO_ID_6' },
];

// ── Multi-platform source store ────────────────────────────────────────────────

interface SocialVideoSources {
  youtube:   VideoCard[];
  tiktok:    VideoCard[];
  instagram: VideoCard[];
  wankong:   VideoCard[];
}

// ── YouTube playlist fetcher ───────────────────────────────────────────────────

async function fetchYouTubePlaylistVideos(
  playlistId: string,
  apiKey: string,
  maxResults = 6,
): Promise<VideoCard[]> {
  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('playlistId', playlistId);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

  const json = await res.json();
  return (json.items ?? []).map((item: Record<string, unknown>) => {
    const snippet = item.snippet as Record<string, unknown>;
    const ri      = snippet.resourceId as Record<string, string>;
    const thumbs  = snippet.thumbnails as Record<string, { url: string }>;
    const videoId = ri.videoId;
    const thumb   = thumbs?.maxres?.url ?? thumbs?.high?.url ?? thumbs?.medium?.url ?? '';
    return {
      id:        `yt-${videoId}`,
      videoId,
      title:     (snippet.title as string) ?? 'YouTube Video',
      thumbnail: thumb,
      platform:  'youtube' as const,
      embedUrl:  `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`,
    };
  });
}

// ── Instagram placeholder ──────────────────────────────────────────────────────

async function fetchInstagramReels(): Promise<VideoCard[]> {
  // TODO: connect Instagram Basic Display API when credentials available
  return [
    { id: 'ig-1', videoId: 'ig-placeholder-1', title: 'WANKONG on Instagram', thumbnail: 'gradient:from-[#833ab4] to-[#fd1d1d]', platform: 'instagram' },
    { id: 'ig-2', videoId: 'ig-placeholder-2', title: 'Creator Spotlight — IG', thumbnail: 'gradient:from-[#fd1d1d] to-[#fcb045]', platform: 'instagram' },
  ];
}

// ── TikTok placeholder ─────────────────────────────────────────────────────────

async function fetchTikTokVideos(): Promise<VideoCard[]> {
  // TODO: connect TikTok Display API when credentials available
  return [
    { id: 'tt-1', videoId: 'tt-placeholder-1', title: 'WANKONG on TikTok', thumbnail: 'gradient:from-[#010101] to-[#69C9D0]', platform: 'tiktok' },
    { id: 'tt-2', videoId: 'tt-placeholder-2', title: 'Trending — TikTok',   thumbnail: 'gradient:from-[#69C9D0] to-[#010101]', platform: 'tiktok' },
  ];
}

// ── Talent Arena winners fetcher ───────────────────────────────────────────────

async function fetchTalentArenaWinners(): Promise<VideoCard[]> {
  const { data } = await supabase
    .from('competition_entries_v2')
    .select('id, title, performer_name, video_url, thumbnail_url')
    .in('status', ['winner', 'live'])
    .order('votes_count', { ascending: false })
    .limit(2);

  return ((data ?? []) as Record<string, string>[]).map(e => ({
    id:        `wk-${e.id}`,
    videoId:   e.id,
    title:     e.title ?? `${e.performer_name} — Performance`,
    thumbnail: e.thumbnail_url ?? 'gradient:from-[#00D9FF] to-[#9D4EDD]',
    platform:  'wankong' as const,
    embedUrl:  e.video_url ?? undefined,
  }));
}

// ── Player Modal ───────────────────────────────────────────────────────────────

function PlayerModal({ card, onClose }: { card: VideoCard; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const embedSrc = card.embedUrl
    ?? (card.platform === 'youtube' ? `https://www.youtube.com/embed/${card.videoId}?autoplay=1&rel=0` : null);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#0D1635] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-white font-semibold text-sm truncate pr-4">{card.title}</span>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Embed */}
        <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
          {embedSrc ? (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={embedSrc}
              title={card.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            // Placeholder for platforms without embed yet
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="text-5xl">
                {card.platform === 'tiktok' ? '♪' : card.platform === 'instagram' ? '◈' : '🎤'}
              </span>
              <p className="text-white/50 text-sm text-center px-8">
                {card.platform === 'tiktok'
                  ? 'TikTok embed coming soon — visit @WANKONG on TikTok'
                  : card.platform === 'instagram'
                  ? 'Instagram embed coming soon — follow @WANKONG'
                  : card.title}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FeaturedPerformancesGrid() {
  const [sources,       setSources]       = useState<SocialVideoSources>({ youtube: [], tiktok: [], instagram: [], wankong: [] });
  const [mergedVideos,  setMergedVideos]  = useState<VideoCard[]>([]);
  const [displayOffset, setDisplayOffset] = useState(0);
  const [activeCard,    setActiveCard]    = useState<VideoCard | null>(null);
  const [loading,       setLoading]       = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load all sources ──────────────────────────────────────────────────

  const loadSources = useCallback(async () => {
    setLoading(true);
    const next: SocialVideoSources = { youtube: [], tiktok: [], instagram: [], wankong: [] };

    // Priority 1: WANKONG Talent Arena winners
    try { next.wankong = await fetchTalentArenaWinners(); } catch { /* silent */ }

    // Priority 2: YouTube playlist
    if (YT_API_KEY && YT_PLAYLIST) {
      try {
        next.youtube = await fetchYouTubePlaylistVideos(YT_PLAYLIST, YT_API_KEY, 8);
      } catch {
        next.youtube = FALLBACK_VIDEOS;
      }
    } else {
      next.youtube = FALLBACK_VIDEOS;
    }

    // Placeholders
    try { next.instagram = await fetchInstagramReels(); } catch { /* silent */ }
    try { next.tiktok    = await fetchTikTokVideos();   } catch { /* silent */ }

    setSources(next);

    // Merge: wankong first, then youtube, then ig, then tiktok
    const merged = [
      ...next.wankong,
      ...next.youtube,
      ...next.instagram,
      ...next.tiktok,
    ];
    setMergedVideos(merged);
    setLoading(false);
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  // ── Auto-rotation every 8 s ───────────────────────────────────────────

  useEffect(() => {
    if (mergedVideos.length <= GRID_VISIBLE) return;
    intervalRef.current = setInterval(() => {
      setDisplayOffset(prev => (prev + GRID_VISIBLE) % mergedVideos.length);
    }, ROTATION_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [mergedVideos.length]);

  // ── Compute visible slice (wraps around) ──────────────────────────────

  const visibleCards: VideoCard[] = (() => {
    if (!mergedVideos.length) return [];
    const total  = mergedVideos.length;
    const result: VideoCard[] = [];
    for (let i = 0; i < Math.min(GRID_VISIBLE, total); i++) {
      result.push(mergedVideos[(displayOffset + i) % total]);
    }
    return result;
  })();

  // ── Dot indicator ─────────────────────────────────────────────────────

  const totalPages  = mergedVideos.length > 0 ? Math.ceil(mergedVideos.length / GRID_VISIBLE) : 0;
  const currentPage = totalPages > 0 ? Math.floor(displayOffset / GRID_VISIBLE) % totalPages : 0;

  return (
    <section className="py-16">

      <div className="max-w-7xl mx-auto px-4">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00D9FF]/10 border border-[#00D9FF]/25 rounded-full mb-3">
              <Globe className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span className="text-[#00D9FF] text-xs font-semibold uppercase tracking-wider">Global Stage</span>
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">
              Featured Performances
            </h2>
            <p className="text-white/40 text-sm mt-1.5 max-w-lg">
              Discover this week's top creators across the WANKONG ecosystem — competitions, YouTube, and beyond.
            </p>
          </div>

          {/* Platform legend */}
          <div className="flex flex-wrap gap-2 sm:justify-end pb-1">
            {(['wankong', 'youtube', 'instagram', 'tiktok'] as const).map(p => {
              const labels: Record<string, string> = {
                wankong: '★ WANKONG', youtube: '▶ YouTube',
                instagram: '◈ Instagram', tiktok: '♪ TikTok',
              };
              const has = sources[p].length > 0;
              return (
                <span
                  key={p}
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-opacity ${has ? 'opacity-100' : 'opacity-30'}`}
                  style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}
                >
                  {labels[p]}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Horizontal scroll strip ────────────────────────────── */}
        {loading ? (
          <div
            className="flex gap-4 overflow-x-auto pb-4 mb-6"
            style={{ scrollbarWidth: 'none' }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-[260px] h-[160px] flex-shrink-0 rounded-2xl bg-white/5 animate-pulse border border-white/8"
              />
            ))}
          </div>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-4 mb-6 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none' }}
          >
            {visibleCards.map(card => (
              <div
                key={card.id}
                className="w-[260px] flex-shrink-0 snap-center"
              >
                <SocialVideoCard card={card} onClick={setActiveCard} />
              </div>
            ))}
          </div>
        )}

        {/* ── Rotation dots ───────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mb-8">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDisplayOffset(i * GRID_VISIBLE);
                  if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
                }}
                className={`rounded-full transition-all ${i === currentPage ? 'w-6 h-2 bg-[#00D9FF]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* ── CTA Buttons ─────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/collections/talent-arena"
            className="px-7 py-3 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Vote Now
          </Link>
          <Link
            to="/collections/talent-arena"
            className="px-7 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
          >
            Join Competition
          </Link>
          <Link
            to="/dashboard/artist"
            className="px-7 py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Upload Performance
          </Link>
        </div>

      </div>

      {/* ── Player Modal ─────────────────────────────────────────── */}
      {activeCard && (
        <PlayerModal card={activeCard} onClose={() => setActiveCard(null)} />
      )}
    </section>
  );
}
