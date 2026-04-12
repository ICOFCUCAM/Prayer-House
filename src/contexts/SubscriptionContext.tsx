import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'pro' | 'premium';

export interface Plan {
  id:          PlanId;
  name:        string;
  price:       number;   // USD/month
  yearlyPrice: number;   // USD/year
  color:       string;
  features:    string[];
}

interface SubscriptionRow {
  id:                  string;
  user_id:             string;
  plan:                PlanId;
  status:              'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_end:  string;
  stripe_subscription_id?: string;
}

interface SubscriptionCtx {
  plan:         PlanId;
  status:       string;
  loading:      boolean;
  periodEnd:    string | null;
  isPro:        boolean;
  isPremium:    boolean;
  isFreeTier:   boolean;
  plans:        Plan[];
  refresh:      () => Promise<void>;
}

// ── Plan definitions ───────────────────────────────────────────────────────────

export const PLANS: Plan[] = [
  {
    id:          'free',
    name:        'Free',
    price:       0,
    yearlyPrice: 0,
    color:       '#9ca3af',
    features: [
      'Stream 30-second previews',
      'Browse all music & books',
      'Create 1 playlist',
      'Enter competitions',
      'Basic search',
    ],
  },
  {
    id:          'pro',
    name:        'Pro',
    price:       4.99,
    yearlyPrice: 47.88,
    color:       '#00D9FF',
    features: [
      'Unlimited full-track streaming',
      'Offline downloads (50 tracks)',
      'Ad-free listening',
      'Create unlimited playlists',
      'High-quality audio (320 kbps)',
      'Early access to new releases',
    ],
  },
  {
    id:          'premium',
    name:        'Premium',
    price:       9.99,
    yearlyPrice: 95.88,
    color:       '#9D4EDD',
    features: [
      'Everything in Pro',
      'Unlimited offline downloads',
      'Full audiobook library access',
      'Exclusive competition voting',
      'Lossless audio (FLAC)',
      'Priority distribution queue',
      'Creator analytics insights',
      'Family sharing (up to 5)',
    ],
  },
];

// ── Context ────────────────────────────────────────────────────────────────────

const Ctx = createContext<SubscriptionCtx | null>(null);

export function useSubscription(): SubscriptionCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSubscription must be inside SubscriptionProvider');
  return c;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [row,     setRow]     = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setRow(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow(data as SubscriptionRow | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const plan      = row?.plan ?? 'free';
  const isPro     = plan === 'pro' || plan === 'premium';
  const isPremium = plan === 'premium';

  const value: SubscriptionCtx = {
    plan,
    status:     row?.status ?? 'active',
    loading,
    periodEnd:  row?.current_period_end ?? null,
    isPro,
    isPremium,
    isFreeTier: plan === 'free',
    plans:      PLANS,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
