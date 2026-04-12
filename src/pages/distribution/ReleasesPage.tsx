import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Radio, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface PlatformStatus {
  platform_id:  string;
  platform_name: string;
  status:        'pending' | 'processing' | 'live' | 'rejected';
  live_url?:     string | null;
  go_live_date?: string | null;
}

interface Release {
  id: string;
  status: string;
  audio_url?: string | null;
  artwork_url?: string | null;
  ditto_release_id?: string | null;
  created_at: string;
  title?: string | null;
  platforms?: PlatformStatus[];
}

// ── Platform defaults ─────────────────────────────────────────────────────────

const DEFAULT_PLATFORMS: Omit<PlatformStatus, 'status'>[] = [
  { platform_id: 'spotify',       platform_name: 'Spotify'       },
  { platform_id: 'apple_music',   platform_name: 'Apple Music'   },
  { platform_id: 'youtube_music', platform_name: 'YouTube Music' },
  { platform_id: 'tidal',         platform_name: 'TIDAL'         },
  { platform_id: 'deezer',        platform_name: 'Deezer'        },
  { platform_id: 'amazon_music',  platform_name: 'Amazon Music'  },
  { platform_id: 'soundcloud',    platform_name: 'SoundCloud'    },
  { platform_id: 'audiomack',     platform_name: 'Audiomack'     },
];

function derivePlatformStatus(releaseStatus: string): PlatformStatus['status'] {
  if (releaseStatus === 'live')                      return 'live';
  if (releaseStatus === 'approved_for_distribution') return 'processing';
  if (releaseStatus === 'rejected')                  return 'rejected';
  return 'pending';
}

async function fetchPlatformStatuses(releaseId: string, releaseStatus: string): Promise<PlatformStatus[]> {
  try {
    const { data } = await supabase
      .from('distribution_platform_statuses')
      .select('platform_id,platform_name,status,live_url,go_live_date')
      .eq('release_id', releaseId);

    if (data && data.length > 0) {
      // Merge with defaults to ensure all platforms appear
      return DEFAULT_PLATFORMS.map(p => {
        const found = data.find((d: any) => d.platform_id === p.platform_id);
        return found
          ? { ...p, ...found } as PlatformStatus
          : { ...p, status: derivePlatformStatus(releaseStatus) };
      });
    }
  } catch { /* table may not exist */ }

  // Fall back: derive from overall release status
  return DEFAULT_PLATFORMS.map(p => ({
    ...p,
    status: derivePlatformStatus(releaseStatus),
  }));
}

// Status badge colour map: queued=gray, pending_admin_review=gold,
// approved_for_distribution=green, live=cyan, rejected=red
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  queued:                    { label: 'Queued',           color: '#9ca3af' },
  pending_admin_review:      { label: 'Pending Review',   color: '#FFB800' },
  approved_for_distribution: { label: 'Approved',         color: '#00F5A0' },
  live:                      { label: 'Live',             color: '#00D9FF' },
  rejected:                  { label: 'Rejected',         color: '#ef4444' },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, color: '#9ca3af' };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// Gradient circle artwork placeholder
function ArtworkPlaceholder({ id }: { id: string }) {
  const gradients = [
    'from-[#9D4EDD] to-[#00D9FF]',
    'from-[#FFB800] to-[#FF6B00]',
    'from-[#00F5A0] to-[#00D9FF]',
    'from-[#FF6B00] to-[#9D4EDD]',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const g = gradients[Math.abs(hash) % gradients.length];
  return (
    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${g} flex items-center justify-center flex-shrink-0`}>
      <Radio className="w-6 h-6 text-white/60" />
    </div>
  );
}

// ── Platform status colours ───────────────────────────────────────────────────

const PLAT_STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',    color: '#9ca3af' },
  processing: { label: 'Processing', color: '#60a5fa' },
  live:       { label: 'Live',       color: '#00F5A0' },
  rejected:   { label: 'Rejected',   color: '#ef4444' },
};

// ── Release Card ──────────────────────────────────────────────────────────────

function ReleaseCard({ release }: { release: Release }) {
  const [expanded,  setExpanded]  = useState(false);
  const [platforms, setPlatforms] = useState<PlatformStatus[]>(release.platforms ?? []);
  const [loadingPl, setLoadingPl] = useState(false);

  const cfg   = getStatusCfg(release.status);
  const title = release.title ?? `Release #${release.id.slice(0, 8)}`;

  const loadPlatforms = useCallback(async () => {
    if (platforms.length) return;
    setLoadingPl(true);
    const statuses = await fetchPlatformStatuses(release.id, release.status);
    setPlatforms(statuses);
    setLoadingPl(false);
  }, [release.id, release.status, platforms.length]);

  const toggle = () => {
    setExpanded(e => !e);
    if (!expanded) loadPlatforms();
  };

  const liveCount = platforms.filter(p => p.status === 'live').length;

  return (
    <div className="bg-white/5 border border-white/10 hover:border-white/15 rounded-2xl transition-all overflow-hidden">
      {/* Header row */}
      <div className="p-5 flex items-center gap-5">
        {release.artwork_url ? (
          <img src={release.artwork_url} alt={title}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <ArtworkPlaceholder id={release.id} />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{formatDate(release.created_at)}</p>
          {liveCount > 0 && (
            <p className="text-[#00F5A0] text-xs mt-0.5 font-medium">Live on {liveCount}/{DEFAULT_PLATFORMS.length} platforms</p>
          )}
          {release.ditto_release_id && (
            <p className="text-gray-600 text-[11px] font-mono mt-0.5">ID: {release.ditto_release_id}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap"
            style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
            {cfg.label}
          </span>
          <button onClick={toggle}
            className="p-1.5 rounded-lg text-white/30 hover:text-white transition-colors"
            title={expanded ? 'Hide platforms' : 'Show platform delivery'}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Platform delivery panel */}
      {expanded && (
        <div className="border-t border-white/5 px-5 py-4">
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">Platform Delivery Status</p>
          {loadingPl ? (
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 w-24 rounded-full bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {platforms.map(p => {
                const pcfg = PLAT_STATUS_CFG[p.status] ?? PLAT_STATUS_CFG.pending;
                return (
                  <div key={p.platform_id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border"
                    style={{ background: `${pcfg.color}08`, borderColor: `${pcfg.color}20` }}>
                    <div className="min-w-0 mr-2">
                      <p className="text-white text-[11px] font-medium truncate">{p.platform_name}</p>
                      <p className="text-[10px]" style={{ color: pcfg.color }}>{pcfg.label}</p>
                      {p.go_live_date && p.status !== 'live' && (
                        <p className="text-white/25 text-[9px]">ETA {new Date(p.go_live_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      )}
                    </div>
                    {p.live_url ? (
                      <a href={p.live_url} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-white/30 hover:text-white transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pcfg.color, opacity: p.status === 'pending' ? 0.4 : 1 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReleasesPage() {
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Get user via supabase.auth.getUser(), redirect to '/' if not logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      if (cancelled) return;

      // Fetch distribution_releases — try user_id first, then artist_id
      let data: Release[] = [];

      const res1 = await supabase
        .from('distribution_releases')
        .select('id, status, audio_url, artwork_url, ditto_release_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!res1.error && res1.data?.length) {
        data = res1.data as Release[];
      } else {
        const res2 = await supabase
          .from('distribution_releases')
          .select('id, status, audio_url, artwork_url, ditto_release_id, created_at')
          .eq('artist_id', user.id)
          .order('created_at', { ascending: false });
        data = (res2.data ?? []) as Release[];
      }

      // Enrich with title from release_metadata (if available)
      const enriched: Release[] = await Promise.all(
        data.map(async rel => {
          try {
            const { data: meta } = await supabase
              .from('release_metadata')
              .select('title')
              .eq('release_id', rel.id)
              .maybeSingle();
            return { ...rel, title: meta?.title ?? null };
          } catch {
            return rel;
          }
        })
      );

      if (!cancelled) {
        setReleases(enriched);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  const filtered = statusFilter === 'All'
    ? releases
    : releases.filter(r => r.status === statusFilter);

  const statuses = Array.from(new Set(releases.map(r => r.status)));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A1128] via-[#100D2E] to-[#0A1128] border-b border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-4 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <span className="text-[#00D9FF] text-sm font-medium uppercase tracking-widest">Distribution</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">My Releases</h1>
              <p className="text-gray-400 text-sm mt-1">{releases.length} release{releases.length !== 1 ? 's' : ''} total</p>
            </div>
            {/* "Distribute New Release" button → /upload/distribute */}
            <button
              onClick={() => navigate('/upload/distribute')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Distribute New Release
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">

        {/* Status filter pills */}
        {releases.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {['All', ...statuses].map(sf => {
              const cfg = sf === 'All' ? null : getStatusCfg(sf);
              return (
                <button
                  key={sf}
                  onClick={() => setStatusFilter(sf)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    statusFilter === sf
                      ? 'bg-white/15 text-white border-white/20'
                      : 'bg-white/5 text-gray-400 hover:text-white border-white/5'
                  }`}
                  style={statusFilter === sf && cfg ? { borderColor: `${cfg.color}44`, color: cfg.color } : {}}
                >
                  {sf === 'All' ? 'All' : cfg?.label ?? sf}
                </button>
              );
            })}
          </div>
        )}

        {/* Release cards: artwork placeholder (gradient), title, status, created_at */}
        {filtered.length === 0 ? (
          <div className="text-center py-24 bg-white/3 border border-white/5 rounded-2xl">
            {releases.length === 0 ? (
              <>
                <div className="text-6xl mb-6">🎵</div>
                {/* Empty state */}
                <h2 className="text-xl font-bold text-white mb-2">No releases yet.</h2>
                <p className="text-gray-400 mb-8">Start distributing your music worldwide.</p>
                <button
                  onClick={() => navigate('/upload/distribute')}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Distribute New Release
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-400">No releases match this filter.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(release => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
