import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface CompetitionEntry {
  id:               string;
  room_id:          string | null;
  title:            string;
  category:         string | null;
  video_url:        string | null;
  preview_clip_url: string | null;
  thumbnail_url:    string | null;
  duration_seconds: number | null;
  ai_score:         number | null;
  votes_count:      number;
  status:           string;
  is_winner:        boolean;
  created_at:       string;
}

export function useCompetitionStatus(userId?: string) {
  const [entries,  setEntries]  = useState<CompetitionEntry[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const uid = userId;
    if (!uid) { setLoading(false); return; }

    supabase
      .from('competition_entries_v2')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEntries((data as CompetitionEntry[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`comp-status-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_entries_v2', filter: `user_id=eq.${uid}` },
        payload => {
          if (payload.eventType === 'UPDATE') {
            setEntries(prev =>
              prev.map(e => e.id === (payload.new as any).id ? { ...e, ...(payload.new as any) } : e)
            );
          } else if (payload.eventType === 'INSERT') {
            setEntries(prev => [payload.new as CompetitionEntry, ...prev]);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return { entries, loading };
}
