import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Release {
  id: string; status: string; audio_url?: string; artwork_url?: string;
  created_at: string; ditto_release_id?: string;
}

const STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  queued:                    { label: 'Queued',         colour: '#6B7280' },
  pending_admin_review:      { label: 'Under Review',   colour: '#FFB800' },
  approved_for_distribution: { label: 'Approved',       colour: '#00F5A0' },
  live:                      { label: 'Live',           colour: '#00D9FF' },
  rejected:                  { label: 'Rejected',       colour: '#EF4444' },
};

const GRADIENTS = [
  'from-[#9D4EDD] to-[#00D9FF]', 'from-[#FF6B00] to-[#FFB800]',
  'from-[#00F5A0] to-[#00D9FF]', 'from-[#FFB800] to-[#9D4EDD]',
];

export default function ReleasesPage() {
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate('/'); return; }
      setUserId(data.user.id);
      supabase.from('distribution_releases')
        .select('*')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .then(({ data: rows }) => {
          setReleases(rows ?? []);
          setLoading(false);
        });
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <div className="border-b border-white/5 py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">My Releases</h1>
            <p className="text-white/40 text-sm mt-1">Track your music distribution globally</p>
          </div>
          <Link
            to="/upload/distribute"
            className="bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            + Distribute New Release
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {releases.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-6">💿</div>
            <h3 className="text-2xl font-bold text-white mb-3">No releases yet</h3>
            <p className="text-white/40 mb-8">Start distributing your music worldwide to Spotify, Apple Music, and 150+ platforms.</p>
            <Link
              to="/upload/distribute"
              className="inline-block bg-[#00D9FF] text-black font-bold px-8 py-3 rounded-xl hover:bg-[#00D9FF]/80 transition-colors"
            >
              Distribute Your First Release
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {releases.map((release, i) => {
              const sc = STATUS_CONFIG[release.status] ?? { label: release.status, colour: '#6B7280' };
              return (
                <div key={release.id} className="flex items-center gap-5 bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
                  {/* Artwork */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} shrink-0 flex items-center justify-center`}>
                    {release.artwork_url
                      ? <img src={release.artwork_url} className="w-full h-full object-cover rounded-xl" alt="" />
                      : <span className="text-2xl">🎵</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">Release #{release.id.slice(0, 8)}</p>
                    {release.ditto_release_id && (
                      <p className="text-white/30 text-xs">Ditto ID: {release.ditto_release_id}</p>
                    )}
                    <p className="text-white/30 text-xs mt-1">{new Date(release.created_at).toLocaleDateString()}</p>
                  </div>

                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full border shrink-0"
                    style={{ color: sc.colour, borderColor: `${sc.colour}40`, backgroundColor: `${sc.colour}10` }}
                  >
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
