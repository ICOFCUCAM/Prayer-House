import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Period helpers ─────────────────────────────────────────────────────────────

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y';

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  '7d': 7, '30d': 30, '90d': 90, '1y': 365,
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function changePct(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

// ── Revenue category metadata ──────────────────────────────────────────────────

export const REVENUE_COLOURS: Record<string, string> = {
  music_stream:         '#9D4EDD',
  book_sale:            '#00D9FF',
  audiobook_play:       '#00F5A0',
  competition_win:      '#FFB800',
  fan_vote_reward:      '#FF6B00',
  distribution_royalty: '#a78bfa',
  translation_sale:     '#34d399',
  course_sale:          '#60a5fa',
};

export const REVENUE_LABELS: Record<string, string> = {
  music_stream:         'Music Streams',
  book_sale:            'Content Sales',
  audiobook_play:       'Audiobooks',
  competition_win:      'Competition Prizes',
  fan_vote_reward:      'Fan Vote Rewards',
  distribution_royalty: 'Distribution Royalties',
  translation_sale:     'Translation Sales',
  course_sale:          'Course Sales',
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TopTrack {
  id:        string;
  title:     string;
  cover_url: string | null;
  streams:   number;
  earnings:  number;
}

export interface GeoRow {
  country: string;
  streams: number;
}

export interface RevenueSegment {
  label:  string;
  amount: number;
  pct:    number;
  colour: string;
}

export interface DayPoint {
  date:  string;
  count: number;
}

export interface AnalyticsData {
  loading:           boolean;
  // KPIs
  totalStreams:      number;
  streamsChange:     number;   // % vs prev period
  watchTimeHrs:      number;
  watchTimeChange:   number;
  newFollowers:      number;
  followersChange:   number;
  totalRevenue:      number;
  revenueChange:     number;
  engagementRate:    number;   // % of non-skipped streams
  avgSessionPct:     number;   // avg listen completion %
  // Charts
  streamsByDay:      DayPoint[];
  revenueBreakdown:  RevenueSegment[];
  // Tables
  topContent:        TopTrack[];
  audienceByCountry: GeoRow[];
}

const EMPTY: AnalyticsData = {
  loading: true,
  totalStreams: 0, streamsChange: 0,
  watchTimeHrs: 0, watchTimeChange: 0,
  newFollowers: 0, followersChange: 0,
  totalRevenue: 0, revenueChange: 0,
  engagementRate: 0, avgSessionPct: 0,
  streamsByDay: [], revenueBreakdown: [],
  topContent: [], audienceByCountry: [],
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAnalytics(period: AnalyticsPeriod): AnalyticsData {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData>(EMPTY);

  const load = useCallback(async () => {
    if (!user) return;

    setData(d => ({ ...d, loading: true }));

    const days     = PERIOD_DAYS[period];
    const since    = daysAgo(days);
    const prevSince = daysAgo(days * 2);

    // ── Step 1: Get artist's tracks ──────────────────────────────────────────
    const { data: trackRows } = await supabase
      .from('tracks')
      .select('id, title, artwork_url')
      .eq('artist_id', user.id);

    const tracks   = trackRows ?? [];
    const trackIds = tracks.map(t => t.id);

    // If no tracks, bail early with zeros
    if (trackIds.length === 0) {
      // Still load followers and revenue
      const [
        { count: curFollowers },
        { count: prevFollowers },
        { data: earningsRows },
        { data: prevEarningsRows },
      ] = await Promise.all([
        supabase.from('artist_followers').select('id', { count: 'exact', head: true })
          .eq('artist_id', user.id).gte('created_at', since),
        supabase.from('artist_followers').select('id', { count: 'exact', head: true })
          .eq('artist_id', user.id).gte('created_at', prevSince).lt('created_at', since),
        supabase.from('creator_earnings').select('amount, category')
          .eq('user_id', user.id).gte('created_at', since),
        supabase.from('creator_earnings').select('amount')
          .eq('user_id', user.id).gte('created_at', prevSince).lt('created_at', since),
      ]);

      const totalRevenue = (earningsRows ?? []).reduce((s, e) => s + Number(e.amount), 0);
      const prevRevenue  = (prevEarningsRows ?? []).reduce((s, e) => s + Number(e.amount), 0);

      setData({
        loading: false,
        totalStreams: 0, streamsChange: 0,
        watchTimeHrs: 0, watchTimeChange: 0,
        newFollowers: curFollowers ?? 0,
        followersChange: changePct(curFollowers ?? 0, prevFollowers ?? 0),
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueChange: changePct(totalRevenue, prevRevenue),
        engagementRate: 0, avgSessionPct: 0,
        streamsByDay: buildEmptyDays(days),
        revenueBreakdown: buildBreakdown(earningsRows ?? [], totalRevenue),
        topContent: [], audienceByCountry: [],
      });
      return;
    }

    // ── Step 2: Parallel fetches ─────────────────────────────────────────────
    const [
      { count: curStreams },
      { count: prevStreams },
      { data: streamEvents },
      { count: curFollowers },
      { count: prevFollowers },
      { data: earningsRows },
      { data: prevEarningsRows },
      { data: trackEarnings },
    ] = await Promise.all([
      // Current period stream count
      supabase.from('stream_events')
        .select('id', { count: 'exact', head: true })
        .in('track_id', trackIds)
        .gte('played_at', since),
      // Previous period stream count
      supabase.from('stream_events')
        .select('id', { count: 'exact', head: true })
        .in('track_id', trackIds)
        .gte('played_at', prevSince).lt('played_at', since),
      // Full events for analytics (limit 5000 to avoid large payloads)
      supabase.from('stream_events')
        .select('played_at, duration_pct, skipped, country, track_id')
        .in('track_id', trackIds)
        .gte('played_at', since)
        .limit(5000),
      // Follower count
      supabase.from('artist_followers')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', user.id)
        .gte('created_at', since),
      // Previous follower count
      supabase.from('artist_followers')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', user.id)
        .gte('created_at', prevSince).lt('created_at', since),
      // Current revenue
      supabase.from('creator_earnings')
        .select('amount, category, created_at')
        .eq('user_id', user.id)
        .gte('created_at', since),
      // Previous revenue
      supabase.from('creator_earnings')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', prevSince).lt('created_at', since),
      // Per-track earnings (artist_earnings table)
      supabase.from('artist_earnings')
        .select('track_id, artist_share')
        .eq('artist_id', user.id)
        .in('track_id', trackIds),
    ]);

    const events = streamEvents ?? [];

    // ── Step 3: Compute KPIs ─────────────────────────────────────────────────

    const totalStreams = curStreams ?? 0;

    // Watch time: avg completion × 3 min × total streams → hours
    const avgDurationPct = events.length
      ? events.reduce((s, e) => s + (e.duration_pct ?? 50), 0) / events.length
      : 0;
    const watchTimeHrs = Math.round(
      (totalStreams * 3 * (avgDurationPct / 100)) / 60 * 10
    ) / 10;

    // Engagement: non-skipped / total
    const nonSkipped    = events.filter(e => !e.skipped).length;
    const engagementRate = totalStreams > 0
      ? Math.round((nonSkipped / totalStreams) * 1000) / 10
      : 0;

    // Revenue totals
    const totalRevenue = (earningsRows ?? []).reduce((s, e) => s + Number(e.amount), 0);
    const prevRevenue  = (prevEarningsRows ?? []).reduce((s, e) => s + Number(e.amount), 0);

    // ── Step 4: Stream timeline ──────────────────────────────────────────────
    const dayCount   = Math.min(days, 90);
    const dayMap: Record<string, number> = {};
    for (let i = dayCount - 1; i >= 0; i--) {
      dayMap[new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)] = 0;
    }
    for (const e of events) {
      const d = e.played_at?.slice(0, 10);
      if (d && d in dayMap) dayMap[d]++;
    }
    const streamsByDay: DayPoint[] = Object.entries(dayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    // ── Step 5: Revenue breakdown ────────────────────────────────────────────
    const revenueBreakdown = buildBreakdown(earningsRows ?? [], totalRevenue);

    // ── Step 6: Top performing content ──────────────────────────────────────
    const trackStreamMap: Record<string, number> = {};
    for (const e of events) {
      trackStreamMap[e.track_id] = (trackStreamMap[e.track_id] ?? 0) + 1;
    }

    const earnMap: Record<string, number> = {};
    for (const e of trackEarnings ?? []) {
      earnMap[e.track_id] = (earnMap[e.track_id] ?? 0) + Number(e.artist_share);
    }

    const topContent: TopTrack[] = tracks
      .map(t => ({
        id:        t.id,
        title:     t.title,
        cover_url: t.artwork_url ?? null,
        streams:   trackStreamMap[t.id] ?? 0,
        earnings:  Math.round((earnMap[t.id] ?? 0) * 100) / 100,
      }))
      .sort((a, b) => b.streams - a.streams)
      .slice(0, 5);

    // ── Step 7: Audience by country ──────────────────────────────────────────
    const countryMap: Record<string, number> = {};
    for (const e of events) {
      if (e.country && e.country !== 'unknown') {
        countryMap[e.country] = (countryMap[e.country] ?? 0) + 1;
      }
    }

    // Fallback to stream_geo aggregate if stream_events has no country data
    if (Object.keys(countryMap).length === 0) {
      const { data: geoRows } = await supabase
        .from('stream_geo')
        .select('country, streams')
        .eq('user_id', user.id)
        .eq('period', 'all_time');
      for (const g of geoRows ?? []) {
        countryMap[g.country] = g.streams;
      }
    }

    const audienceByCountry: GeoRow[] = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, streams]) => ({ country, streams }));

    // ── Commit state ─────────────────────────────────────────────────────────
    setData({
      loading: false,
      totalStreams,
      streamsChange:   changePct(totalStreams, prevStreams ?? 0),
      watchTimeHrs,
      watchTimeChange: changePct(watchTimeHrs, 0), // no prev watch time for now
      newFollowers:    curFollowers ?? 0,
      followersChange: changePct(curFollowers ?? 0, prevFollowers ?? 0),
      totalRevenue:    Math.round(totalRevenue * 100) / 100,
      revenueChange:   changePct(totalRevenue, prevRevenue),
      engagementRate,
      avgSessionPct:   Math.round(avgDurationPct),
      streamsByDay,
      revenueBreakdown,
      topContent,
      audienceByCountry,
    });
  }, [user, period]);

  useEffect(() => { load(); }, [load]);

  return data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEmptyDays(days: number): DayPoint[] {
  return Array.from({ length: Math.min(days, 90) }, (_, i) => ({
    date:  new Date(Date.now() - (Math.min(days, 90) - 1 - i) * 86_400_000).toISOString().slice(0, 10),
    count: 0,
  }));
}

function buildBreakdown(
  rows: { amount: unknown; category: string }[],
  total: number,
): RevenueSegment[] {
  const catMap: Record<string, number> = {};
  for (const e of rows) {
    catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount);
  }
  return Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({
      label:  REVENUE_LABELS[cat] ?? cat,
      amount: Math.round(amount * 100) / 100,
      pct:    total > 0 ? Math.round((amount / total) * 100) : 0,
      colour: REVENUE_COLOURS[cat] ?? '#9ca3af',
    }));
}

// ── Event recorder (call from player/actions) ─────────────────────────────────

export async function recordAnalyticsEvent(params: {
  artist_id:     string;
  user_id?:      string | null;
  track_id?:     string;
  event_type:    'stream' | 'download' | 'playlist_add' | 'like' | 'purchase'
                | 'competition_vote' | 'subscription' | 'tip' | 'royalty' | 'follow';
  platform?:     string;
  country?:      string;
  device?:       string;
  revenue_cents?: number;
  metadata?:     Record<string, unknown>;
}): Promise<void> {
  await supabase.from('analytics_events').insert([{
    artist_id:     params.artist_id,
    user_id:       params.user_id ?? null,
    track_id:      params.track_id ?? null,
    event_type:    params.event_type,
    platform:      params.platform ?? 'web',
    country:       params.country ?? null,
    device:        params.device ?? null,
    revenue_cents: params.revenue_cents ?? 0,
    metadata:      params.metadata ?? {},
  }]);
}
