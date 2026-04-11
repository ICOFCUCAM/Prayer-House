import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Radio } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Release {
  id: string;
  status: string;
  audio_url?: string | null;
  artwork_url?: string | null;
  ditto_release_id?: string | null;
  created_at: string;
  title?: string | null; // joined from release_metadata
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
            {filtered.map(release => {
              const cfg = getStatusCfg(release.status);
              const title = release.title ?? `Release #${release.id.slice(0, 8)}`;

              return (
                <div
                  key={release.id}
                  className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-5 flex items-center gap-5 transition-all"
                >
                  {/* Artwork — gradient placeholder or actual image */}
                  {release.artwork_url ? (
                    <img
                      src={release.artwork_url}
                      alt={title}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ArtworkPlaceholder id={release.id} />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{formatDate(release.created_at)}</p>
                    {release.ditto_release_id && (
                      <p className="text-gray-600 text-xs mt-0.5">Ditto: {release.ditto_release_id}</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                    style={{
                      background: `${cfg.color}15`,
                      color: cfg.color,
                      border: `1px solid ${cfg.color}33`,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
