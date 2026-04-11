import { supabase } from '@/lib/supabase';

// ── LevelUpgradeWorker ─────────────────────────────────────────
// Creator level system: Bronze → Silver → Gold → Platinum → Diamond → Global Ambassador
// XP awarded for all platform activities.

export type CreatorLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Global Ambassador';

export const LEVEL_THRESHOLDS: Record<CreatorLevel, number> = {
  'Bronze':           0,
  'Silver':         500,
  'Gold':          2000,
  'Platinum':      5000,
  'Diamond':      15000,
  'Global Ambassador': 50000,
};

export const XP_REWARDS = {
  upload_track:       50,
  upload_book:        75,
  upload_audiobook:  100,
  competition_entry:  30,
  competition_win:   500,
  stream_milestone:   25,  // per 1000 streams
  vote_received:       2,
  follower_gained:     5,
  translation_done:   40,
  book_sale:          10,
};

export function getLevelFromXP(xp: number): CreatorLevel {
  const levels = Object.entries(LEVEL_THRESHOLDS).reverse() as [CreatorLevel, number][];
  for (const [level, threshold] of levels) {
    if (xp >= threshold) return level;
  }
  return 'Bronze';
}

export function getNextLevel(current: CreatorLevel): CreatorLevel | null {
  const levels: CreatorLevel[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Global Ambassador'];
  const idx = levels.indexOf(current);
  return idx < levels.length - 1 ? levels[idx + 1] : null;
}

export function getXPToNextLevel(xp: number): number {
  const current = getLevelFromXP(xp);
  const next = getNextLevel(current);
  if (!next) return 0;
  return LEVEL_THRESHOLDS[next] - xp;
}

export async function awardXP(userId: string, xp: number, reason?: string): Promise<CreatorLevel> {
  const { data: existing } = await supabase
    .from('creator_levels')
    .select('xp, level')
    .eq('user_id', userId)
    .maybeSingle();

  const currentXP = (existing?.xp ?? 0) + xp;
  const newLevel = getLevelFromXP(currentXP);

  await supabase.from('creator_levels').upsert([{
    user_id: userId,
    xp:      currentXP,
    level:   newLevel,
  }], { onConflict: 'user_id' });

  return newLevel;
}

export async function getCreatorLevel(userId: string) {
  const { data } = await supabase
    .from('creator_levels')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    return { xp: 0, level: 'Bronze' as CreatorLevel, next_level: 'Silver', xp_to_next: 500 };
  }

  const next = getNextLevel(data.level as CreatorLevel);
  const xpToNext = getXPToNextLevel(data.xp);

  return { ...data, next_level: next, xp_to_next: xpToNext };
}

export async function getLeaderboard(limit = 50) {
  const { data } = await supabase
    .from('creator_levels')
    .select('user_id, xp, level')
    .order('xp', { ascending: false })
    .limit(limit);
  return data ?? [];
}
