import { supabase } from '@/lib/supabase';
import type { CreatorLevel } from './CreatorLevelService';

// ── CreatorLeaderboardEngine ──────────────────────────────────
// Queries and ranks creators by XP from the creator_levels table.

export interface LeaderboardEntry {
  user_id: string;
  xp: number;
  level: CreatorLevel;
  display_name: string;
  photo_url: string | null;
  rank: number;
}

export async function getGlobalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('creator_levels')
    .select('user_id, xp, level, profiles(display_name, photo_url)')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getGlobalLeaderboard error:', error);
    return [];
  }

  return (data ?? []).map((row: any, index: number) => ({
    user_id: row.user_id,
    xp: row.xp,
    level: row.level as CreatorLevel,
    display_name: row.profiles?.display_name ?? 'Unknown Creator',
    photo_url: row.profiles?.photo_url ?? null,
    rank: index + 1,
  }));
}

export async function getLeaderboardByLevel(
  level: CreatorLevel,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('creator_levels')
    .select('user_id, xp, level, profiles(display_name, photo_url)')
    .eq('level', level)
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getLeaderboardByLevel error:', error);
    return [];
  }

  return (data ?? []).map((row: any, index: number) => ({
    user_id: row.user_id,
    xp: row.xp,
    level: row.level as CreatorLevel,
    display_name: row.profiles?.display_name ?? 'Unknown Creator',
    photo_url: row.profiles?.photo_url ?? null,
    rank: index + 1,
  }));
}

export async function getUserRank(userId: string): Promise<number> {
  // Fetch the user's current XP.
  const { data: userRow, error: userErr } = await supabase
    .from('creator_levels')
    .select('xp')
    .eq('user_id', userId)
    .maybeSingle();

  if (userErr) {
    console.error('getUserRank fetch error:', userErr);
    return -1;
  }

  const userXP: number = userRow?.xp ?? 0;

  // Count creators with strictly higher XP — add 1 for 1-indexed rank.
  const { count, error: countErr } = await supabase
    .from('creator_levels')
    .select('user_id', { count: 'exact', head: true })
    .gt('xp', userXP);

  if (countErr) {
    console.error('getUserRank count error:', countErr);
    return -1;
  }

  return (count ?? 0) + 1;
}
