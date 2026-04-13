import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Music, Loader2, Radio, ChevronDown, ChevronUp,
  AlertCircle, Clock, CheckCircle, Send, Globe,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MyRelease {
  id:               string;
  title:            string;
  artist_name:      string;
  release_type:     string;
  cover_url:        string | null;
  status:           string;
  genre:            string | null;
  track_count:      number;
  submitted_at:     string | null;
  created_at:       string;
  admin_note:       string | null;
  ditto_release_id: string | null;
}

// ── Status configuration ──────────────────────────────────────────────────────

const STATUS_CFG: Record<string, {
  label:   string;
  color:   string;
  icon:    React.ReactNode;
  message: string;
}> = {
  draft: {
    label:   'Draft',
    color:   '#9ca3af',
    icon:    <Clock className="w-3.5 h-3.5" />,
    message: 'Your release is saved as a draft. Complete all required fields and submit when ready.',
  },
  submitted: {
    label:   'Submitted',
    color:   '#FFB800',
    icon:    <Clock className="w-3.5 h-3.5" />,
    message: 'Your release has been submitted and is in the admin queue for review.',
  },
  under_review: {
    label:   'Under Review',
    color:   '#60a5fa',
    icon:    <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    message: 'An admin is currently reviewing your release. You\'ll hear back soon.',
  },
  changes_requested: {
    label:   'Changes Requested',
    color:   '#FF6B00',
    icon:    <AlertCircle className="w-3.5 h-3.5" />,
    message: 'The admin has requested changes to your release. See the note below.',
  },
  approved: {
    label:   'Approved',
    color:   '#00F5A0',
    icon:    <CheckCircle className="w-3.5 h-3.5" />,
    message: 'Your release has been approved and will be forwarded to Ditto Music shortly.',
  },
  sent_to_ditto: {
    label:   'Sent to Ditto',
    color:   '#9D4EDD',
    icon:    <Send className="w-3.5 h-3.5" />,
    message: 'Your release has been sent to Ditto Music. Distribution is in progress.',
  },
  distributed: {
    label:   'Distributed',
    color:   '#00D9FF',
    icon:    <Globe className="w-3.5 h-3.5" />,
    message: 'Your release is being distributed across platforms.',
  },
  live: {
    label:   'Live',
    color:   '#00F5A0',
    icon:    <Radio className="w-3.5 h-3.5" />,
    message: 'Your release is live on streaming platforms worldwide!',
  },
  rejected: {
    label:   'Rejected',
    color:   '#FF4466',
    icon:    <AlertCircle className="w-3.5 h-3.5" />,
    message: 'Your release was not approved. See the admin note for details.',
  },
  // legacy
  pending_admin_review: {
    label:   'Pending Review',
    color:   '#FFB800',
    icon:    <Clock className="w-3.5 h-3.5" />,
    message: 'Your release is in the admin queue for review.',
  },
  approved_for_distribution: {
    label:   'Approved',
    color:   '#00F5A0',
    icon:    <CheckCircle className="w-3.5 h-3.5" />,
    message: 'Your release has been approved for distribution.',
  },
  submitted_to_ditto: {
    label:   'Sent to Ditto',
    color:   '#9D4EDD',
    icon:    <Send className="w-3.5 h-3.5" />,
    message: 'Your release has been sent to Ditto Music.',
  },
};

function getStatusCfg(status: string) {
  return STATUS_CFG[status] ?? {
    label: status, color: '#9ca3af', icon: <Clock className="w-3.5 h-3.5" />, message: '',
  };
}

// ── Pipeline step labels ──────────────────────────────────────────────────────

const PIPELINE_STEPS = ['draft', 'submitted', 'under_review', 'approved', 'sent_to_ditto', 'live'];

function getPipelineIndex(status: string): number {
  const normalised = status === 'approved_for_distribution' ? 'approved'
    : status === 'submitted_to_ditto' ? 'sent_to_ditto'
    : status === 'pending_admin_review' ? 'submitted'
    : status;
  return PIPELINE_STEPS.indexOf(normalised);
}

// ── Release Card ──────────────────────────────────────────────────────────────

function ReleaseCard({ release }: { release: MyRelease }) {
  const [expanded, setExpanded] = useState(false);
  const cfg        = getStatusCfg(release.status);
  const pipelineIdx = getPipelineIndex(release.status);
  const isFailed   = release.status === 'rejected' || release.status === 'changes_requested';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/15 transition-all">
      {/* Header row */}
      <div className="p-4 flex items-center gap-4">
        {/* Artwork */}
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
          {release.cover_url
            ? <img src={release.cover_url} alt="" className="w-full h-full object-cover" />
            : <Music className="w-6 h-6 text-white/40" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{release.title}</p>
          <p className="text-gray-500 text-xs truncate mt-0.5">
            {release.artist_name} · {release.release_type.toUpperCase()} · {release.track_count} track{release.track_count !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: cfg.color + '20', color: cfg.color, border: `1px solid ${cfg.color}30` }}
            >
              {cfg.icon}
              {cfg.label}
            </span>
            {release.submitted_at && (
              <span className="text-[10px] text-gray-600">
                {new Date(release.submitted_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-1.5 text-gray-500 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {/* Status message */}
          <p className="text-sm text-gray-400">{cfg.message}</p>

          {/* Admin note for changes_requested / rejected */}
          {release.admin_note && (isFailed) && (
            <div className="flex items-start gap-3 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
              <div>
                <p className="text-[#FF6B00] text-xs font-semibold mb-0.5">Admin Feedback</p>
                <p className="text-gray-300 text-sm">{release.admin_note}</p>
              </div>
            </div>
          )}

          {/* Pipeline progress bar (only for non-failed states) */}
          {!isFailed && pipelineIdx >= 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                {PIPELINE_STEPS.map((step, i) => {
                  const stepCfg = STATUS_CFG[step] ?? { label: step, color: '#9ca3af' };
                  const isActive  = i === pipelineIdx;
                  const isComplete = i < pipelineIdx;
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={[
                          'w-2.5 h-2.5 rounded-full transition-all',
                          isComplete ? 'bg-[#00F5A0]' : isActive ? '' : 'bg-white/10',
                        ].join(' ')}
                        style={isActive ? { background: stepCfg.color } : {}}
                      />
                      <span
                        className="text-[9px] text-center leading-tight"
                        style={{ color: isActive ? stepCfg.color : isComplete ? '#00F5A0' : '#4b5563' }}
                      >
                        {stepCfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Connecting line */}
              <div className="relative h-0.5 bg-white/10 rounded-full -mt-7 mx-[5px] z-0">
                <div
                  className="absolute inset-y-0 left-0 bg-[#00F5A0] rounded-full transition-all"
                  style={{ width: pipelineIdx > 0 ? `${(pipelineIdx / (PIPELINE_STEPS.length - 1)) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* Ditto ID if available */}
          {release.ditto_release_id && (
            <p className="text-[11px] text-gray-600 font-mono">
              Ditto ID: {release.ditto_release_id}
            </p>
          )}

          {/* CTA for draft releases */}
          {release.status === 'draft' && (
            <Link
              to="/dashboard/artist/upload-music"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] text-xs font-semibold rounded-xl hover:bg-[#9D4EDD]/20 transition-colors"
            >
              <Music className="w-3.5 h-3.5" />
              Continue Editing
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function MyReleasesPanel() {
  const { user } = useAuth();
  const [releases, setReleases] = useState<MyRelease[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchReleases = async () => {
      const { data, error } = await supabase
        .from('distribution_releases')
        .select('id, title, artist_name, release_type, cover_url, status, genre, track_count, submitted_at, created_at, admin_note, ditto_release_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) setReleases((data ?? []) as MyRelease[]);
      setLoading(false);
    };

    fetchReleases();

    // Realtime — update status badges live
    const ch = supabase
      .channel(`my-releases-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'distribution_releases',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setReleases(prev =>
          prev.map(r => r.id === payload.new.id ? { ...r, ...(payload.new as Partial<MyRelease>) } : r)
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#9D4EDD] animate-spin" />
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
        <Radio className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm font-medium mb-1">No releases yet</p>
        <p className="text-gray-600 text-xs mb-4">Upload a single or album to start your distribution journey.</p>
        <Link
          to="/upload/music"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Upload Music
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">My Releases</h3>
          <p className="text-xs text-gray-500 mt-0.5">{releases.length} release{releases.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          to="/distribution/releases"
          className="text-xs text-[#00D9FF] hover:text-white transition-colors"
        >
          View all →
        </Link>
      </div>

      {releases.map(r => <ReleaseCard key={r.id} release={r} />)}
    </div>
  );
}
