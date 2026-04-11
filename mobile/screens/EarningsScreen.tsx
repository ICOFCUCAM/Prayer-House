import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EarningRow {
  id: string; category: string; amount: number; created_at: string;
}

type Period = 'month' | 'quarter' | 'all';

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0A1128';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';

const CATEGORY_META: Record<string, { label: string; icon: string; colour: string }> = {
  music_stream:         { label: 'Music Streams',     icon: '🎵', colour: CYAN   },
  book_sale:            { label: 'Book Sales',         icon: '📚', colour: ORANGE },
  audiobook_play:       { label: 'Audiobook Plays',    icon: '🎧', colour: PURPLE },
  competition_win:      { label: 'Competition Wins',   icon: '🏆', colour: GOLD   },
  fan_vote_reward:      { label: 'Fan Votes',          icon: '❤',  colour: '#EF4444' },
  distribution_royalty: { label: 'Royalties',          icon: '💿', colour: GREEN  },
  translation_sale:     { label: 'Translations',       icon: '🌍', colour: '#A78BFA' },
};

const PERIOD_LABELS: Record<Period, string> = {
  month:   'This Month',
  quarter: '3 Months',
  all:     'All Time',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function periodStart(p: Period): string | null {
  const now = new Date();
  if (p === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  if (p === 'quarter') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d.toISOString();
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const { user } = useAuth();
  const [period,   setPeriod]   = useState<Period>('month');
  const [rows,     setRows]     = useState<EarningRow[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let q = supabase.from('creator_earnings').select('id,category,amount,created_at').eq('user_id', user.id);
    const start = periodStart(period);
    if (start) q = q.gte('created_at', start);
    q = q.order('created_at', { ascending: false });

    const { data } = await q;
    setRows((data ?? []) as EarningRow[]);
    setLoading(false);
  }, [user, period]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.noAuthText}>Sign in to view your earnings</Text>
      </View>
    );
  }

  // Aggregate by category
  const grouped: Record<string, number> = {};
  rows.forEach(r => { grouped[r.category] = (grouped[r.category] ?? 0) + r.amount; });
  const categories = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const total      = rows.reduce((s, r) => s + r.amount, 0);
  const maxAmount  = Math.max(...categories.map(([, v]) => v), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Period selector */}
      <View style={styles.periodRow}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodPill, period === p && styles.periodPillActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Earnings</Text>
        {loading
          ? <ActivityIndicator color={GOLD} />
          : <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>}
        <Text style={styles.totalPeriod}>{PERIOD_LABELS[period]}</Text>
      </View>

      {/* Category breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>By Category</Text>
        {categories.length === 0 && !loading && (
          <Text style={styles.emptyText}>No earnings in this period yet.</Text>
        )}
        {categories.map(([cat, amount]) => {
          const meta = CATEGORY_META[cat] ?? { label: cat, icon: '💰', colour: CYAN };
          const barPct = amount / maxAmount;
          return (
            <View key={cat} style={styles.catRow}>
              <Text style={styles.catIcon}>{meta.icon}</Text>
              <View style={styles.catInfo}>
                <View style={styles.catLabelRow}>
                  <Text style={styles.catLabel}>{meta.label}</Text>
                  <Text style={[styles.catAmount, { color: meta.colour }]}>{formatCurrency(amount)}</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${barPct * 100}%` as any, backgroundColor: meta.colour }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Recent transactions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {rows.slice(0, 10).length === 0 && !loading && (
          <Text style={styles.emptyText}>No transactions yet.</Text>
        )}
        {rows.slice(0, 10).map(row => {
          const meta = CATEGORY_META[row.category] ?? { label: row.category, icon: '💰', colour: CYAN };
          return (
            <View key={row.id} style={styles.txRow}>
              <Text style={styles.txIcon}>{meta.icon}</Text>
              <View style={styles.txInfo}>
                <Text style={styles.txLabel}>{meta.label}</Text>
                <Text style={styles.txDate}>{formatDate(row.created_at)}</Text>
              </View>
              <Text style={styles.txAmount}>+{formatCurrency(row.amount)}</Text>
            </View>
          );
        })}
      </View>

      {/* Withdrawal button */}
      <TouchableOpacity
        style={styles.withdrawBtn}
        onPress={() => Alert.alert(
          'Withdrawal',
          'Withdrawals coming soon.\n\nMinimum: $10 USD\n\nMethods: PayPal, Bank Transfer, Mobile Money.',
          [{ text: 'OK' }]
        )}
      >
        <Text style={styles.withdrawText}>Request Withdrawal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: NAVY },
  content:         { padding: 16, paddingBottom: 100 },
  center:          { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  noAuthText:      { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  periodRow:       { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodPill:      { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  periodPillActive:{ backgroundColor: CYAN, borderColor: CYAN },
  periodText:      { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 13 },
  periodTextActive:{ color: NAVY },
  totalCard:       { backgroundColor: 'rgba(255,184,0,0.1)', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: GOLD + '30' },
  totalLabel:      { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 },
  totalAmount:     { color: GOLD, fontSize: 42, fontWeight: '900' },
  totalPeriod:     { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 6 },
  card:            { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sectionTitle:    { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 14 },
  emptyText:       { color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  catRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  catIcon:         { fontSize: 20, width: 28 },
  catInfo:         { flex: 1 },
  catLabelRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catLabel:        { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  catAmount:       { fontWeight: '700', fontSize: 13 },
  barBg:           { height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  barFill:         { height: 5, borderRadius: 3 },
  txRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 10 },
  txIcon:          { fontSize: 18, width: 28 },
  txInfo:          { flex: 1 },
  txLabel:         { color: '#fff', fontSize: 13, fontWeight: '500' },
  txDate:          { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },
  txAmount:        { color: GREEN, fontWeight: '700', fontSize: 14 },
  withdrawBtn:     { borderRadius: 14, borderWidth: 2, borderColor: GOLD, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  withdrawText:    { color: GOLD, fontWeight: '800', fontSize: 16 },
});
