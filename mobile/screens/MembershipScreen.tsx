import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, FlatList,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatters';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MembershipPlan {
  id: string;
  creator_id: string;
  tier: MembershipTier;
  price_usd: number;
  description: string;
  creator_name?: string;
}

interface ActiveSubscription {
  id: string;
  creator_id: string;
  tier: MembershipTier;
  started_at: string;
  creator_name?: string;
}

type MembershipTier = 'Supporter' | 'Insider' | 'VIP' | 'Super Fan';

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0A1128';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';

/**
 * Tier metadata: colour, emoji, vote multiplier, default price.
 * Prices shown are defaults; actual price comes from creator_memberships row.
 */
const TIER_META: Record<MembershipTier, {
  colour: string;
  emoji: string;
  multiplier: number;
  defaultPrice: number;
  perks: string[];
}> = {
  'Supporter': {
    colour: GREEN,
    emoji: '💚',
    multiplier: 1.5,
    defaultPrice: 3,
    perks: ['1.5× vote weight', 'Supporter badge', 'Creator updates'],
  },
  'Insider': {
    colour: CYAN,
    emoji: '💎',
    multiplier: 2,
    defaultPrice: 9,
    perks: ['2× vote weight', 'Insider badge', 'Early content access', 'Direct messages'],
  },
  'VIP': {
    colour: PURPLE,
    emoji: '👑',
    multiplier: 3,
    defaultPrice: 25,
    perks: ['3× vote weight', 'VIP badge', 'Exclusive content', 'Monthly 1-on-1 Q&A'],
  },
  'Super Fan': {
    colour: GOLD,
    emoji: '⭐',
    multiplier: 5,
    defaultPrice: 50,
    perks: ['5× vote weight', 'Super Fan badge', 'Co-create credits', 'Merch discount', 'Priority support'],
  },
};

const TIER_ORDER: MembershipTier[] = ['Supporter', 'Insider', 'VIP', 'Super Fan'];

// ── Sub-components ─────────────────────────────────────────────────────────────

function TierCard({
  tier,
  price,
  subscribed,
  onSubscribe,
}: {
  tier: MembershipTier;
  price: number;
  subscribed: boolean;
  onSubscribe: () => void;
}) {
  const meta = TIER_META[tier];
  return (
    <View style={[styles.tierCard, { borderColor: meta.colour + '50' }]}>
      {/* Header */}
      <View style={styles.tierHeader}>
        <View style={[styles.tierBadge, { backgroundColor: meta.colour + '20' }]}>
          <Text style={styles.tierEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.tierTitleBlock}>
          <Text style={[styles.tierName, { color: meta.colour }]}>{tier}</Text>
          <Text style={styles.tierMultiplier}>{meta.multiplier}× vote weight</Text>
        </View>
        <Text style={[styles.tierPrice, { color: meta.colour }]}>
          {formatCurrency(price)}<Text style={styles.tierPricePer}>/mo</Text>
        </Text>
      </View>

      {/* Perks */}
      <View style={styles.perkList}>
        {meta.perks.map(perk => (
          <View key={perk} style={styles.perkRow}>
            <Text style={[styles.perkDot, { color: meta.colour }]}>•</Text>
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>

      {/* Subscribe button */}
      <TouchableOpacity
        style={[
          styles.subscribeBtn,
          subscribed
            ? { backgroundColor: meta.colour + '20', borderColor: meta.colour + '50' }
            : { backgroundColor: meta.colour },
        ]}
        onPress={onSubscribe}
        disabled={subscribed}
      >
        <Text style={[styles.subscribeBtnText, { color: subscribed ? meta.colour : NAVY }]}>
          {subscribed ? '✓ Subscribed' : `Subscribe — ${formatCurrency(price)}/mo`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SubscriptionCard({ sub }: { sub: ActiveSubscription }) {
  const meta = TIER_META[sub.tier] ?? TIER_META['Supporter'];
  return (
    <View style={[styles.subCard, { borderColor: meta.colour + '40' }]}>
      <Text style={styles.subEmoji}>{meta.emoji}</Text>
      <View style={styles.subInfo}>
        <Text style={[styles.subTier, { color: meta.colour }]}>{sub.tier}</Text>
        <Text style={styles.subCreator}>{sub.creator_name ?? 'Creator'}</Text>
        <Text style={styles.subMultiplier}>{meta.multiplier}× vote weight active</Text>
      </View>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MembershipScreen() {
  const { user } = useAuth();

  const [plans,         setPlans]         = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [subscribing,   setSubscribing]   = useState<string | null>(null);
  const [tab,           setTab]           = useState<'discover' | 'mine'>('mine');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch this user's active subscriptions
    const { data: subData } = await supabase
      .from('membership_subscribers')
      .select('id, creator_id, tier, started_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    // Fetch available membership plans from all creators
    const { data: planData } = await supabase
      .from('creator_memberships')
      .select('id, creator_id, tier, price_usd, description')
      .order('price_usd', { ascending: true })
      .limit(30);

    // Enrich with creator names from artists table
    const creatorIds = [
      ...new Set([
        ...(subData ?? []).map((s: any) => s.creator_id),
        ...(planData ?? []).map((p: any) => p.creator_id),
      ]),
    ];

    let nameMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: artistData } = await supabase
        .from('artists')
        .select('user_id, name')
        .in('user_id', creatorIds);
      nameMap = Object.fromEntries((artistData ?? []).map((a: any) => [a.user_id, a.name]));
    }

    setSubscriptions(
      ((subData ?? []) as any[]).map(s => ({
        ...s,
        creator_name: nameMap[s.creator_id] ?? 'Creator',
      }))
    );

    setPlans(
      ((planData ?? []) as any[]).map(p => ({
        ...p,
        creator_name: nameMap[p.creator_id] ?? 'Creator',
      }))
    );

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSubscribe = async (plan: MembershipPlan) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to subscribe.');
      return;
    }

    // Check if already subscribed
    const alreadySubscribed = subscriptions.some(
      s => s.creator_id === plan.creator_id && s.tier === plan.tier
    );
    if (alreadySubscribed) return;

    setSubscribing(plan.id);

    const { error } = await supabase
      .from('membership_subscribers')
      .insert({
        user_id:    user.id,
        creator_id: plan.creator_id,
        tier:       plan.tier,
        started_at: new Date().toISOString(),
      });

    setSubscribing(null);

    if (error) {
      Alert.alert('Subscription failed', error.message);
    } else {
      Alert.alert(
        'Subscribed!',
        `You are now a ${plan.tier} member of ${plan.creator_name ?? 'this creator'}.\n\nYour vote weight: ${TIER_META[plan.tier]?.multiplier ?? 1}×`,
        [{ text: 'Great!', onPress: load }]
      );
    }
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.centreText}>Sign in to manage memberships</Text>
      </View>
    );
  }

  // Group plans by creator so we can display them cleanly
  const plansByCreator = plans.reduce<Record<string, MembershipPlan[]>>((acc, p) => {
    const key = p.creator_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Memberships</Text>
        <Text style={styles.subtitle}>Support creators · Boost your vote weight</Text>
      </View>

      {/* Tab switch */}
      <View style={styles.tabRow}>
        {(['mine', 'discover'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabPill, tab === t && styles.tabPillActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'mine' ? 'My Memberships' : 'Discover'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color={CYAN} style={{ marginVertical: 40 }} />}

      {/* ── MY MEMBERSHIPS ── */}
      {!loading && tab === 'mine' && (
        <>
          {/* Vote multiplier info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How Vote Multipliers Work</Text>
            <Text style={styles.infoBody}>
              When you vote on Talent Arena entries, your tier multiplies the vote weight.
              A Super Fan vote counts as <Text style={{ color: GOLD, fontWeight: '700' }}>5×</Text> a standard vote.
            </Text>
            <View style={styles.multiplierRow}>
              {TIER_ORDER.map(tier => (
                <View key={tier} style={[styles.multiplierBadge, { borderColor: TIER_META[tier].colour + '50' }]}>
                  <Text style={styles.multiplierEmoji}>{TIER_META[tier].emoji}</Text>
                  <Text style={[styles.multiplierValue, { color: TIER_META[tier].colour }]}>
                    {TIER_META[tier].multiplier}×
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {subscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💚</Text>
              <Text style={styles.emptyTitle}>No active memberships</Text>
              <Text style={styles.emptyBody}>
                Switch to Discover to find creators and subscribe.
              </Text>
              <TouchableOpacity onPress={() => setTab('discover')}>
                <Text style={[styles.emptyAction, { color: CYAN }]}>Browse Creators →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Active Subscriptions</Text>
              {subscriptions.map(sub => (
                <SubscriptionCard key={sub.id} sub={sub} />
              ))}
            </>
          )}
        </>
      )}

      {/* ── DISCOVER ── */}
      {!loading && tab === 'discover' && (
        <>
          {Object.keys(plansByCreator).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎭</Text>
              <Text style={styles.emptyTitle}>No membership plans yet</Text>
              <Text style={styles.emptyBody}>
                Creators will list their membership tiers here once they set them up.
              </Text>
            </View>
          ) : (
            Object.entries(plansByCreator).map(([creatorId, creatorPlans]) => {
              const creatorName = creatorPlans[0]?.creator_name ?? 'Creator';
              return (
                <View key={creatorId} style={styles.creatorBlock}>
                  <Text style={styles.creatorName}>{creatorName}</Text>
                  {TIER_ORDER.map(tier => {
                    const plan = creatorPlans.find(p => p.tier === tier);
                    if (!plan) return null;
                    const isSubscribed = subscriptions.some(
                      s => s.creator_id === creatorId && s.tier === tier
                    );
                    return (
                      <TierCard
                        key={plan.id}
                        tier={tier}
                        price={plan.price_usd ?? TIER_META[tier].defaultPrice}
                        subscribed={isSubscribed || subscribing === plan.id}
                        onSubscribe={() => handleSubscribe(plan)}
                      />
                    );
                  })}
                </View>
              );
            })
          )}

          {/* Tier overview for creators not yet on platform */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Membership Tiers</Text>
            {TIER_ORDER.map(tier => {
              const meta = TIER_META[tier];
              return (
                <View key={tier} style={styles.tierOverviewRow}>
                  <Text style={styles.tierOverviewEmoji}>{meta.emoji}</Text>
                  <View style={styles.tierOverviewInfo}>
                    <Text style={[styles.tierOverviewName, { color: meta.colour }]}>{tier}</Text>
                    <Text style={styles.tierOverviewPerks}>{meta.perks.slice(0, 2).join(' · ')}</Text>
                  </View>
                  <Text style={[styles.tierOverviewMultiplier, { color: meta.colour }]}>
                    {meta.multiplier}×
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: NAVY },
  content:              { padding: 16, paddingBottom: 100 },
  center:               { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  centreText:           { color: 'rgba(255,255,255,0.4)', fontSize: 16 },

  header:               { marginBottom: 20, paddingTop: 8 },
  title:                { color: '#fff', fontSize: 26, fontWeight: '900' },
  subtitle:             { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },

  tabRow:               { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tabPill:              { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  tabPillActive:        { backgroundColor: CYAN, borderColor: CYAN },
  tabText:              { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 13 },
  tabTextActive:        { color: NAVY },

  infoCard:             { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  infoTitle:            { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  infoBody:             { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  multiplierRow:        { flexDirection: 'row', gap: 8 },
  multiplierBadge:      { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  multiplierEmoji:      { fontSize: 18 },
  multiplierValue:      { fontWeight: '800', fontSize: 15, marginTop: 4 },

  emptyState:           { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji:           { fontSize: 48, marginBottom: 12 },
  emptyTitle:           { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyBody:            { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  emptyAction:          { fontWeight: '700', fontSize: 14 },

  sectionTitle:         { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 14 },
  subCard:              { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  subEmoji:             { fontSize: 28 },
  subInfo:              { flex: 1 },
  subTier:              { fontWeight: '800', fontSize: 15 },
  subCreator:           { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  subMultiplier:        { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4 },

  creatorBlock:         { marginBottom: 24 },
  creatorName:          { color: '#fff', fontWeight: '800', fontSize: 17, marginBottom: 12 },

  tierCard:             { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  tierHeader:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  tierBadge:            { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tierEmoji:            { fontSize: 22 },
  tierTitleBlock:       { flex: 1 },
  tierName:             { fontWeight: '800', fontSize: 16 },
  tierMultiplier:       { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  tierPrice:            { fontWeight: '900', fontSize: 18 },
  tierPricePer:         { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  perkList:             { marginBottom: 14, gap: 6 },
  perkRow:              { flexDirection: 'row', alignItems: 'center', gap: 6 },
  perkDot:              { fontSize: 16, lineHeight: 20 },
  perkText:             { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  subscribeBtn:         { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  subscribeBtnText:     { fontWeight: '800', fontSize: 14 },

  card:                 { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tierOverviewRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tierOverviewEmoji:    { fontSize: 20, width: 28 },
  tierOverviewInfo:     { flex: 1 },
  tierOverviewName:     { fontWeight: '700', fontSize: 14 },
  tierOverviewPerks:    { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  tierOverviewMultiplier: { fontWeight: '900', fontSize: 16 },
});
