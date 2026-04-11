import { supabase } from '@/lib/supabase';

// ── CompetitionRankingEngine ──────────────────────────────────
// Computes and refreshes entry rankings within a room.
// Score = ai_score * 0.6 + (votes/maxVotes * 100) * 0.4

export interface RankedEntry {
  id: string;
  performer_name: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  votes_count: number;
  ai_score: number;
  final_score: number;
  rank: number;
  status: string;
}

export async function computeRoomRankings(roomId: string): Promise<RankedEntry[]> {
  const { data: entries } = await supabase
    .from('competition_entries_v2')
    .select('id, performer_name, title, video_url, thumbnail_url, votes_count, ai_score, status')
    .eq('room_id', roomId)
    .in('status', ['live', 'winner']);

  if (!entries?.length) return [];

  const maxVotes = Math.max(...entries.map(e => e.votes_count ?? 0), 1);

  const scored = entries.map(entry => {
    const aiScore = entry.ai_score ?? 0;
    const votes   = entry.votes_count ?? 0;
    const final_score = (aiScore * 0.6) + ((votes / maxVotes) * 100 * 0.4);
    return { ...entry, final_score };
  });

  scored.sort((a, b) => b.final_score - a.final_score);
  return scored.map((entry, i) => ({ ...entry, rank: i + 1 })) as RankedEntry[];
}

export async function refreshEntryRankScores(roomId: string): Promise<void> {
  const ranked = await computeRoomRankings(roomId);
  for (const entry of ranked) {
    await supabase
      .from('competition_entries_v2')
      .update({ rank_position: entry.rank, final_score: entry.final_score })
      .eq('id', entry.id);
  }
}
