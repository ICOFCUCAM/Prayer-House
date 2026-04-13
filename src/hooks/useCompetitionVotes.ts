import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useCompetitionVotes(entryId: string) {
  const [votes,   setVotes]   = useState(0);
  const [voted,   setVoted]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial count
    supabase
      .from('competition_entries_v2')
      .select('votes_count')
      .eq('id', entryId)
      .single()
      .then(({ data }) => {
        if (data) setVotes(data.votes_count ?? 0);
        setLoading(false);
      });

    // Check if already voted
    const sessionId = sessionStorage.getItem('wk_session_id') ?? (() => {
      const id = crypto.randomUUID();
      sessionStorage.setItem('wk_session_id', id);
      return id;
    })();

    supabase
      .from('competition_votes')
      .select('id')
      .eq('entry_id', entryId)
      .eq('session_id', sessionId)
      .maybeSingle()
      .then(({ data }) => { if (data) setVoted(true); });

    // Realtime
    const channel = supabase
      .channel(`votes-${entryId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'competition_votes', filter: `entry_id=eq.${entryId}` },
        () => setVotes(v => v + 1),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [entryId]);

  const castVote = useCallback(async () => {
    if (voted) return;
    const sessionId = sessionStorage.getItem('wk_session_id') ?? '';
    const { error } = await supabase.from('competition_votes').insert([{
      entry_id:   entryId,
      session_id: sessionId,
    }]);
    if (!error) {
      setVoted(true);
      // Increment counter on entry
      await supabase.rpc('increment_votes', { entry_id: entryId }).catch(() => {
        supabase
          .from('competition_entries_v2')
          .update({ votes_count: votes + 1, updated_at: new Date().toISOString() })
          .eq('id', entryId);
      });
    }
  }, [entryId, voted, votes]);

  return { votes, voted, loading, castVote };
}
