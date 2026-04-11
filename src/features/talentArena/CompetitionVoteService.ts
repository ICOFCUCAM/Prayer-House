import { supabase } from '@/lib/supabase';

// ── CompetitionVoteService ────────────────────────────────────
// Handles fan voting with deduplication (sessionStorage) and realtime sync.

const VOTED_KEY = 'wankong_voted_entries';

function getVotedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(VOTED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markVoted(entryId: string): void {
  const set = getVotedSet();
  set.add(entryId);
  sessionStorage.setItem(VOTED_KEY, JSON.stringify([...set]));
}

export function hasVoted(entryId: string): boolean {
  return getVotedSet().has(entryId);
}

export async function castVote(entryId: string, userId?: string): Promise<boolean> {
  if (hasVoted(entryId)) return false;

  const { error } = await supabase.from('competition_votes').insert([{
    entry_id: entryId,
    voter_id: userId ?? null,
  }]);

  if (error) return false;

  await supabase.rpc('increment_entry_votes', { entry_id: entryId }).catch(() => {
    // Fallback: direct update
    supabase
      .from('competition_entries_v2')
      .update({ votes_count: supabase.rpc('increment_entry_votes') })
      .eq('id', entryId);
  });

  markVoted(entryId);
  return true;
}

export async function getEntryVoteCount(entryId: string): Promise<number> {
  const { data } = await supabase
    .from('competition_entries_v2')
    .select('votes_count')
    .eq('id', entryId)
    .maybeSingle();
  return data?.votes_count ?? 0;
}
