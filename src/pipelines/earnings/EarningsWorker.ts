import { supabase } from '@/lib/supabase';

// ── EarningsWorker ─────────────────────────────────────────────
// Tracks and records creator earnings across 7 categories.
// All amounts in USD. Paid out monthly via Stripe Connect / Payoneer.

export type EarningCategory =
  | 'music_stream'
  | 'book_sale'
  | 'audiobook_play'
  | 'competition_win'
  | 'fan_vote_reward'
  | 'distribution_royalty'
  | 'translation_sale';

export const CATEGORY_RATES: Record<EarningCategory, number> = {
  music_stream:        0.004,   // per stream
  book_sale:           0.70,    // 70% of sale price
  audiobook_play:      0.0065,  // per minute listened
  competition_win:     500.00,  // flat prize
  fan_vote_reward:     0.10,    // per vote received
  distribution_royalty: 0.85,  // 85% of platform royalty
  translation_sale:    0.60,    // 60% of translation purchase
};

export async function recordEarning(
  userId: string,
  category: EarningCategory,
  amount: number,
  period?: string,
  description?: string,
): Promise<void> {
  const currentPeriod = period ?? new Date().toISOString().slice(0, 7); // YYYY-MM
  await supabase.from('creator_earnings').insert([{
    user_id:     userId,
    category,
    amount,
    period:      currentPeriod,
    description: description ?? null,
    paid:        false,
  }]);
}

export async function recordMusicStream(userId: string, trackId: string): Promise<void> {
  await recordEarning(userId, 'music_stream', CATEGORY_RATES.music_stream);
}

export async function recordBookSale(userId: string, salePrice: number): Promise<void> {
  await recordEarning(userId, 'book_sale', salePrice * CATEGORY_RATES.book_sale);
}

export async function recordAudiobookPlay(userId: string, minutesListened: number): Promise<void> {
  await recordEarning(userId, 'audiobook_play', minutesListened * CATEGORY_RATES.audiobook_play);
}

export async function recordCompetitionWin(userId: string, prizeAmount?: number): Promise<void> {
  await recordEarning(userId, 'competition_win', prizeAmount ?? CATEGORY_RATES.competition_win);
}

export async function recordFanVoteReward(userId: string, voteCount: number): Promise<void> {
  await recordEarning(userId, 'fan_vote_reward', voteCount * CATEGORY_RATES.fan_vote_reward);
}

export async function recordDistributionRoyalty(userId: string, royaltyAmount: number): Promise<void> {
  await recordEarning(userId, 'distribution_royalty', royaltyAmount * CATEGORY_RATES.distribution_royalty);
}

export async function recordTranslationSale(userId: string, salePrice: number): Promise<void> {
  await recordEarning(userId, 'translation_sale', salePrice * CATEGORY_RATES.translation_sale);
}

export async function getCreatorEarnings(userId: string, period?: string) {
  let query = supabase
    .from('creator_earnings')
    .select('*')
    .eq('user_id', userId)
    .order('period', { ascending: false });

  if (period) query = query.eq('period', period);

  const { data } = await query;
  return data ?? [];
}

export async function getTotalEarnings(userId: string): Promise<number> {
  const { data } = await supabase
    .from('creator_earnings')
    .select('amount')
    .eq('user_id', userId);
  return (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
}

export async function getEarningsByCategory(userId: string): Promise<Record<EarningCategory, number>> {
  const rows = await getCreatorEarnings(userId);
  const result = {} as Record<EarningCategory, number>;
  for (const cat of Object.keys(CATEGORY_RATES) as EarningCategory[]) {
    result[cat] = rows.filter(r => r.category === cat).reduce((s, r) => s + (r.amount ?? 0), 0);
  }
  return result;
}

export async function markEarningsPaid(userId: string, period: string): Promise<void> {
  await supabase
    .from('creator_earnings')
    .update({ paid: true })
    .eq('user_id', userId)
    .eq('period', period);
}
