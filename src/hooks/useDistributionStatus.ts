import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type DistributionStatus =
  | 'pending_admin_review'
  | 'approved_for_distribution'
  | 'submitted_to_ditto'
  | 'live'
  | 'rejected'
  | 'priority_distribution_queue';

export interface DistributionRelease {
  id:                string;
  track_id:          string;
  ditto_release_id:  string | null;
  status:            DistributionStatus;
  admin_note:        string | null;
  submitted_at:      string;
  approved_at:       string | null;
  live_at:           string | null;
  is_winner_release: boolean;
  track?: {
    title:       string;
    artwork_url: string | null;
    genre:       string | null;
  };
}

export function useDistributionStatus(trackId?: string) {
  const [releases, setReleases] = useState<DistributionRelease[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let query = supabase
      .from('distribution_releases')
      .select('*, track:tracks(title, artwork_url, genre)')
      .order('submitted_at', { ascending: false });

    if (trackId) query = query.eq('track_id', trackId);

    query.then(({ data }) => {
      setReleases((data as DistributionRelease[]) ?? []);
      setLoading(false);
    });

    const channel = supabase
      .channel(`dist-status-${trackId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'distribution_releases' },
        payload => {
          if (payload.eventType === 'UPDATE') {
            setReleases(prev =>
              prev.map(r => r.id === (payload.new as any).id ? { ...r, ...(payload.new as any) } : r)
            );
          } else if (payload.eventType === 'INSERT') {
            setReleases(prev => [payload.new as DistributionRelease, ...prev]);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [trackId]);

  return { releases, loading };
}
