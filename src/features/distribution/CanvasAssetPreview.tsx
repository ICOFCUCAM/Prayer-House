import React, { useEffect, useRef, useState } from 'react';
import { Film, Image as ImageIcon, Clock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── CanvasAssetPreview ────────────────────────────────────────
// Previews Spotify Canvas / Apple Motion assets for a release.
// asset_type='canvas'          → looping video element
// asset_type='motion_artwork'  → image display

interface CanvasAssetPreviewProps {
  releaseId: string;
}

interface CanvasAsset {
  id: string;
  release_id: string;
  asset_type: 'canvas' | 'motion_artwork' | string;
  asset_url: string;
  status: 'queued' | 'processing' | 'done' | string;
  created_at: string;
  updated_at: string | null;
  title: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  queued: {
    label: 'Queued',
    color: '#9D4EDD',
    icon: <Clock size={13} />,
  },
  processing: {
    label: 'Processing',
    color: '#FFB800',
    icon: <Loader2 size={13} className="animate-spin" />,
  },
  done: {
    label: 'Ready',
    color: '#00F5A0',
    icon: <CheckCircle2 size={13} />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: '#9ca3af',
    icon: <AlertCircle size={13} />,
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        background: `${cfg.color}1A`,
        color: cfg.color,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function AssetTypeLabel({ type }: { type: string }) {
  const isCanvas = type === 'canvas';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        background: isCanvas ? 'rgba(0,217,255,0.1)' : 'rgba(157,78,221,0.1)',
        color: isCanvas ? '#00D9FF' : '#9D4EDD',
        border: `1px solid ${isCanvas ? '#00D9FF' : '#9D4EDD'}40`,
      }}
    >
      {isCanvas ? <Film size={12} /> : <ImageIcon size={12} />}
      {isCanvas ? 'Spotify Canvas' : 'Motion Artwork'}
    </span>
  );
}

function CanvasVideoPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  return (
    <div className="relative aspect-[9/16] max-w-[240px] mx-auto rounded-2xl overflow-hidden" style={{ background: '#000' }}>
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <AlertCircle size={28} style={{ color: '#FF6B00' }} />
          <p className="text-xs text-gray-400">Preview unavailable</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={url}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      )}
      {/* Overlay label */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium"
        style={{ background: 'rgba(0,0,0,0.6)', color: '#00D9FF', backdropFilter: 'blur(6px)' }}
      >
        Canvas Loop
      </div>
    </div>
  );
}

function MotionArtworkPreview({ url, title }: { url: string; title: string | null }) {
  const [error, setError] = useState(false);
  return (
    <div className="relative aspect-square max-w-[300px] mx-auto rounded-2xl overflow-hidden" style={{ background: '#111' }}>
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <AlertCircle size={28} style={{ color: '#FF6B00' }} />
          <p className="text-xs text-gray-400">Image unavailable</p>
        </div>
      ) : (
        <img
          src={url}
          alt={title ?? 'Motion artwork'}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

export function CanvasAssetPreview({ releaseId }: CanvasAssetPreviewProps) {
  const [assets, setAssets] = useState<CanvasAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!releaseId) return;

    async function fetchAssets() {
      setLoading(true);
      setFetchError(null);

      const { data, error } = await supabase
        .from('distribution_canvas_assets')
        .select('id, release_id, asset_type, asset_url, status, created_at, updated_at, title')
        .eq('release_id', releaseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('CanvasAssetPreview fetch error:', error);
        setFetchError(error.message);
        setLoading(false);
        return;
      }

      setAssets((data ?? []) as CanvasAsset[]);
      setLoading(false);
    }

    fetchAssets();

    // Poll every 8s when any asset is still processing or queued
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('distribution_canvas_assets')
        .select('id, release_id, asset_type, asset_url, status, created_at, updated_at, title')
        .eq('release_id', releaseId)
        .order('created_at', { ascending: false });

      if (data) {
        setAssets(data as CanvasAsset[]);
        const allDone = data.every((a: CanvasAsset) => a.status === 'done');
        if (allDone) clearInterval(interval);
      }
    }, 8_000);

    return () => clearInterval(interval);
  }, [releaseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={28} className="animate-spin" style={{ color: '#9D4EDD' }} />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.25)' }}
      >
        <AlertCircle size={20} style={{ color: '#FF6B00' }} />
        <p className="text-sm text-red-300">{fetchError}</p>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-14 rounded-2xl text-center"
        style={{ background: 'rgba(157,78,221,0.06)', border: '1px solid rgba(157,78,221,0.2)' }}
      >
        <Film size={40} className="mb-3" style={{ color: '#9D4EDD' }} />
        <p className="text-sm text-gray-400">No canvas assets found for this release.</p>
        <p className="text-xs text-gray-600 mt-1">
          Canvas assets will appear here once they are generated or uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="rounded-2xl overflow-hidden"
          style={{ background: '#0f1020', border: '1px solid rgba(157,78,221,0.25)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'rgba(157,78,221,0.15)' }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <AssetTypeLabel type={asset.asset_type} />
              {asset.title && (
                <span className="text-sm font-medium text-gray-300 truncate max-w-[200px]">
                  {asset.title}
                </span>
              )}
            </div>
            <StatusBadge status={asset.status} />
          </div>

          {/* Preview area */}
          <div className="p-6 flex justify-center">
            {asset.status !== 'done' ? (
              <div
                className="flex flex-col items-center gap-4 py-12 px-8 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {asset.status === 'processing' ? (
                  <>
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,184,0,0.1)' }}
                    >
                      <Loader2 size={28} className="animate-spin" style={{ color: '#FFB800' }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold" style={{ color: '#FFB800' }}>Processing…</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Your asset is being rendered. This may take a few minutes.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(157,78,221,0.1)' }}
                    >
                      <Clock size={28} style={{ color: '#9D4EDD' }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold" style={{ color: '#9D4EDD' }}>Queued</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Waiting for processing to begin…
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : asset.asset_type === 'canvas' ? (
              <CanvasVideoPlayer url={asset.asset_url} />
            ) : (
              <MotionArtworkPreview url={asset.asset_url} title={asset.title} />
            )}
          </div>

          {/* Footer meta */}
          <div
            className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: 'rgba(157,78,221,0.1)', background: 'rgba(0,0,0,0.2)' }}
          >
            <span className="text-xs text-gray-600">
              Created {new Date(asset.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {asset.status === 'done' && (
              <a
                href={asset.asset_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold transition-colors"
                style={{ color: '#9D4EDD' }}
              >
                Open full size ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
