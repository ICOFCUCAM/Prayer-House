import { supabase } from '@/lib/supabase';

// ── CreatorLevelService ───────────────────────────────────────
// Manages creator XP and level progression in the WANKONG platform.

export type CreatorLevel =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'GlobalAmbassador';

export interface LevelInfo {
  level: CreatorLevel;
  xp: number;
  nextLevel: CreatorLevel | null;
  xpToNext: number;
  progressPercent: number;
}

const LEVEL_ORDER: CreatorLevel[] = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'GlobalAmbassador',
];

const LEVEL_THRESHOLDS: Record<CreatorLevel, number> = {
  Bronze:          0,
  Silver:        500,
  Gold:         2000,
  Platinum:     5000,
  Diamond:     10000,
  GlobalAmbassador: 25000,
};

export function getLevelForXP(xp: number): CreatorLevel {
  let current: CreatorLevel = 'Bronze';
  for (const lvl of LEVEL_ORDER) {
    if (xp >= LEVEL_THRESHOLDS[lvl]) {
      current = lvl;
    }
  }
  return current;
}

function buildLevelInfo(xp: number): LevelInfo {
  const level = getLevelForXP(xp);
  const levelIndex = LEVEL_ORDER.indexOf(level);
  const nextLevel: CreatorLevel | null =
    levelIndex < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[levelIndex + 1] : null;

  const currentThreshold = LEVEL_THRESHOLDS[level];
  const nextThreshold = nextLevel ? LEVEL_THRESHOLDS[nextLevel] : null;

  const xpToNext = nextThreshold ? Math.max(0, nextThreshold - xp) : 0;

  let progressPercent = 100;
  if (nextThreshold !== null) {
    const span = nextThreshold - currentThreshold;
    const earned = xp - currentThreshold;
    progressPercent = span > 0 ? Math.min(100, Math.round((earned / span) * 100)) : 100;
  }

  return { level, xp, nextLevel, xpToNext, progressPercent };
}

export async function getUserLevel(userId: string): Promise<LevelInfo> {
  const { data, error } = await supabase
    .from('creator_levels')
    .select('xp')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('getUserLevel error:', error);
  }

  const xp = data?.xp ?? 0;
  return buildLevelInfo(xp);
}

export async function addXP(userId: string, amount: number): Promise<LevelInfo> {
  // Read current xp first so we can compute the new total.
  const { data: existing } = await supabase
    .from('creator_levels')
    .select('xp')
    .eq('user_id', userId)
    .maybeSingle();

  const currentXP: number = existing?.xp ?? 0;
  const newXP = currentXP + amount;
  const newLevel = getLevelForXP(newXP);

  const { error } = await supabase
    .from('creator_levels')
    .upsert(
      { user_id: userId, xp: newXP, level: newLevel, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('addXP error:', error);
    throw new Error(error.message);
  }

  return buildLevelInfo(newXP);
}

export async function getTopCreators(
  limit = 10,
): Promise<
  Array<{
    user_id: string;
    xp: number;
    level: CreatorLevel;
    display_name: string;
    photo_url: string | null;
  }>
> {
  const { data, error } = await supabase
    .from('creator_levels')
    .select('user_id, xp, level, profiles(display_name, photo_url)')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getTopCreators error:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    user_id: row.user_id,
    xp: row.xp,
    level: row.level as CreatorLevel,
    display_name: row.profiles?.display_name ?? 'Unknown Creator',
    photo_url: row.profiles?.photo_url ?? null,
  }));
}
