import { supabase } from '@/lib/supabase';
import {
  getLevelForXP,
  addXP,
  type CreatorLevel,
} from './CreatorLevelService';

// ── CreatorLevelUpgradeTrigger ────────────────────────────────
// Awards XP for platform actions and triggers level-up checks.

export type EarnAction =
  | 'music_stream'
  | 'book_sale'
  | 'audiobook_play'
  | 'competition_win'
  | 'fan_vote_reward'
  | 'distribution_royalty'
  | 'translation_sale';

const XP_PER_ACTION: Record<EarnAction, number> = {
  music_stream:        1,
  book_sale:          10,
  audiobook_play:      5,
  competition_win:   500,
  fan_vote_reward:     2,
  distribution_royalty: 20,
  translation_sale:   15,
};

export async function checkAndUpgrade(
  userId: string,
): Promise<{ upgraded: boolean; newLevel?: CreatorLevel }> {
  const { data, error } = await supabase
    .from('creator_levels')
    .select('xp, level')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('checkAndUpgrade fetch error:', error);
    return { upgraded: false };
  }

  const xp: number = data?.xp ?? 0;
  const currentStoredLevel: string = data?.level ?? 'Bronze';
  const calculatedLevel = getLevelForXP(xp);

  if (calculatedLevel === currentStoredLevel) {
    return { upgraded: false };
  }

  // Level has changed — persist the corrected level.
  const { error: updateErr } = await supabase
    .from('creator_levels')
    .update({ level: calculatedLevel, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (updateErr) {
    console.error('checkAndUpgrade update error:', updateErr);
    return { upgraded: false };
  }

  return { upgraded: true, newLevel: calculatedLevel };
}

export async function awardXPForAction(
  userId: string,
  action: EarnAction,
): Promise<void> {
  const xpAmount = XP_PER_ACTION[action];
  if (!xpAmount) return;

  try {
    await addXP(userId, xpAmount);
    await checkAndUpgrade(userId);
  } catch (err) {
    console.error(`awardXPForAction(${action}) error:`, err);
  }
}
