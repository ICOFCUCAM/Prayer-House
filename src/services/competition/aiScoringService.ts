import { supabase } from '@/lib/supabase';

export interface ScoreResult {
  pitch_score:        number;
  timing_score:       number;
  clarity_score:      number;
  energy_score:       number;
  presentation_score: number;
  total_score:        number;
}

// ── scoreCompetitionEntry ──────────────────────────────────────
// Placeholder for real AI scoring pipeline.
// Production integration: call a serverless function that processes
// the video through a pitch/timing analysis model (e.g. Spleeter + CREPE).
export async function scoreCompetitionEntry(entryId: string): Promise<ScoreResult> {
  // Deterministic pseudo-score derived solely from entryId (no random — same
  // entry always gets the same score until real AI is wired up).
  const hash = entryId.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  const rand = (min: number, max: number, offset: number) =>
    parseFloat((min + ((hash + offset) % (max - min))).toFixed(2));

  const scores: ScoreResult = {
    pitch_score:        rand(60, 92, 0),
    timing_score:       rand(65, 95, 10),
    clarity_score:      rand(58, 90, 20),
    energy_score:       rand(70, 98, 30),
    presentation_score: rand(55, 88, 40),
    total_score:        0,
  };
  scores.total_score = parseFloat(
    ((scores.pitch_score + scores.timing_score + scores.clarity_score +
      scores.energy_score + scores.presentation_score) / 5).toFixed(2)
  );

  // Persist scores
  const { error } = await supabase.from('competition_scores').insert([{
    entry_id: entryId,
    ...scores,
  }]);
  if (error) throw new Error(`Score insert failed: ${error.message}`);

  // Update entry's ai_score
  await supabase
    .from('competition_entries_v2')
    .update({ ai_score: scores.total_score, updated_at: new Date().toISOString() })
    .eq('id', entryId);

  return scores;
}

// ── selectCompetitionWinner ────────────────────────────────────
// Weighted formula: 60% AI score + 40% votes
export async function selectCompetitionWinner(roomId: string): Promise<string | null> {
  const { data: entries, error } = await supabase
    .from('competition_entries_v2')
    .select('id, ai_score, votes_count')
    .eq('room_id', roomId)
    .eq('status', 'live');

  if (error || !entries || entries.length === 0) return null;

  const maxVotes = Math.max(...entries.map((e: any) => e.votes_count || 0)) || 1;

  const ranked = entries
    .map((e: any) => ({
      id:            e.id,
      combined_score: ((e.ai_score ?? 0) * 0.6) + ((e.votes_count / maxVotes) * 100 * 0.4),
    }))
    .sort((a: any, b: any) => b.combined_score - a.combined_score);

  const winnerId = ranked[0].id;

  await supabase
    .from('competition_entries_v2')
    .update({ is_winner: true, status: 'winner', updated_at: new Date().toISOString() })
    .eq('id', winnerId);

  // Look up the room's prize pool to record accurate amount
  const { data: room } = await supabase
    .from('competition_rooms')
    .select('prize_pool')
    .eq('id', roomId)
    .maybeSingle();
  const prizeAmount = room?.prize_pool ? parseFloat(room.prize_pool) || 0 : 0;

  await supabase.from('competition_prizes').insert([{
    entry_id:       winnerId,
    prize_amount:   prizeAmount,
    currency:       'USD',
    payment_status: 'pending',
  }]);

  return winnerId;
}
