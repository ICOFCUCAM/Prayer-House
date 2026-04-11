import { supabase } from '@/lib/supabase';

// ── TopCreatorsService ────────────────────────────────────────
// Aggregates creator earnings to surface top earners by time window.

export interface TopCreator {
  user_id: string;
  total_earnings: number;
  display_name: string | null;
  photo_url: string | null;
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = now.getUTCDate() - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString();
}

export async function getTopCreatorsThisWeek(limit = 10): Promise<TopCreator[]> {
  const weekStart = getWeekStart();

  // Aggregate in JS since Supabase REST doesn't support GROUP BY natively without RPCs.
  const { data, error } = await supabase
    .from('creator_earnings')
    .select('user_id, amount, profiles(display_name, photo_url)')
    .gte('created_at', weekStart);

  if (error) {
    console.error('getTopCreatorsThisWeek error:', error);
    return [];
  }

  const totals: Record<
    string,
    { total: number; display_name: string | null; photo_url: string | null }
  > = {};

  for (const row of data ?? []) {
    if (!totals[row.user_id]) {
      totals[row.user_id] = {
        total: 0,
        display_name: (row as any).profiles?.display_name ?? null,
        photo_url: (row as any).profiles?.photo_url ?? null,
      };
    }
    totals[row.user_id].total += row.amount ?? 0;
  }

  return Object.entries(totals)
    .map(([user_id, info]) => ({
      user_id,
      total_earnings: info.total,
      display_name: info.display_name,
      photo_url: info.photo_url,
    }))
    .sort((a, b) => b.total_earnings - a.total_earnings)
    .slice(0, limit);
}

export async function getTopCreatorsByEarnings(
  period: string,
  limit = 10,
): Promise<TopCreator[]> {
  // period is expected as 'YYYY-MM', e.g. '2026-04'
  const [year, month] = period.split('-').map(Number);

  if (!year || !month) {
    console.warn('getTopCreatorsByEarnings: invalid period format. Expected YYYY-MM');
    return [];
  }

  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(Date.UTC(year, month, 1)).toISOString();

  const { data, error } = await supabase
    .from('creator_earnings')
    .select('user_id, amount, profiles(display_name, photo_url)')
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd);

  if (error) {
    console.error('getTopCreatorsByEarnings error:', error);
    return [];
  }

  const totals: Record<
    string,
    { total: number; display_name: string | null; photo_url: string | null }
  > = {};

  for (const row of data ?? []) {
    if (!totals[row.user_id]) {
      totals[row.user_id] = {
        total: 0,
        display_name: (row as any).profiles?.display_name ?? null,
        photo_url: (row as any).profiles?.photo_url ?? null,
      };
    }
    totals[row.user_id].total += row.amount ?? 0;
  }

  return Object.entries(totals)
    .map(([user_id, info]) => ({
      user_id,
      total_earnings: info.total,
      display_name: info.display_name,
      photo_url: info.photo_url,
    }))
    .sort((a, b) => b.total_earnings - a.total_earnings)
    .slice(0, limit);
}
