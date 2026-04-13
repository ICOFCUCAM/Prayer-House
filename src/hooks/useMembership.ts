import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MembershipTier {
  id:          string;
  creator_id:  string;
  name:        string;
  price_usd:   number;
  color:       string;
  perks:       string[];
  is_active:   boolean;
}

export interface ActiveSubscription {
  id:          string;
  tier_id:     string;
  tier:        MembershipTier | null;
  status:      string;
  created_at:  string;
  expires_at:  string | null;
}

export interface UseMembershipResult {
  loading:        boolean;
  subscriptions:  ActiveSubscription[];    // all active subs the viewer holds
  hasTier:        (tierId: string) => boolean;
  hasAnyTierOf:   (artistId: string) => boolean;
  isSubscribedTo: (artistId: string, tierId?: string) => boolean;
  refresh:        () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useMembership — returns the current user's active fan subscriptions.
 *
 * Usage:
 *   const { isSubscribedTo, hasTier } = useMembership();
 *   if (!isSubscribedTo(artistId)) return <UpgradePrompt />;
 */
export function useMembership(): UseMembershipResult {
  const { user } = useAuth();
  const [loading, setLoading]           = useState(true);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from('fan_subscriptions')
      .select(`
        id, tier_id, status, created_at, expires_at,
        membership_tiers:tier_id (
          id, creator_id, name, price_usd, color, perks, is_active
        )
      `)
      .eq('fan_id', user.id)
      .eq('status', 'active');

    const active = (data ?? []).filter((s: any) => {
      // Treat null expires_at as lifetime; otherwise check expiry
      if (s.expires_at && new Date(s.expires_at) < new Date()) return false;
      return true;
    }).map((s: any) => ({
      id:         s.id,
      tier_id:    s.tier_id,
      tier:       s.membership_tiers ?? null,
      status:     s.status,
      created_at: s.created_at,
      expires_at: s.expires_at,
    }));

    setSubscriptions(active);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const hasTier = useCallback((tierId: string) =>
    subscriptions.some(s => s.tier_id === tierId),
  [subscriptions]);

  const hasAnyTierOf = useCallback((artistId: string) =>
    subscriptions.some(s => (s.tier as any)?.creator_id === artistId),
  [subscriptions]);

  const isSubscribedTo = useCallback((artistId: string, tierId?: string) => {
    if (tierId) return hasTier(tierId);
    return hasAnyTierOf(artistId);
  }, [hasTier, hasAnyTierOf]);

  return { loading, subscriptions, hasTier, hasAnyTierOf, isSubscribedTo, refresh: load };
}
