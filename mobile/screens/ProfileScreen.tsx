import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatCount, getLevelColour } from '../utils/formatters';
import { Platform } from 'react-native';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CreatorLevel { level: string; xp: number; }
interface EarningRow   { category: string; amount: number; }

const LEVEL_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'GlobalAmbassador'];
const LEVEL_XP    = [0, 500, 2000, 5000, 10000, 25000];

const CATEGORY_LABEL: Record<string, string> = {
  music_stream:       'Music Streams',
  book_sale:          'Book Sales',
  audiobook_play:     'Audiobook Plays',
  competition_win:    'Competition Wins',
  fan_vote_reward:    'Fan Votes',
  distribution_royalty: 'Royalties',
  translation_sale:   'Translations',
};

const NAVY   = '#0A1128';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';

// ── Level helpers ──────────────────────────────────────────────────────────────

function getNextLevel(current: string) {
  const idx = LEVEL_ORDER.indexOf(current);
  return idx < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[idx + 1] : null;
}

function getXPProgress(current: string, xp: number) {
  const idx  = LEVEL_ORDER.indexOf(current);
  const min  = LEVEL_XP[idx] ?? 0;
  const max  = LEVEL_XP[idx + 1] ?? min;
  const pct  = max > min ? Math.min(1, (xp - min) / (max - min)) : 1;
  return { min, max, pct };
}

// ── Login form ─────────────────────────────────────────────────────────────────

function LoginView() {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [oauthLoading,setOAuthLoading]= useState<'google'|'apple'|null>(null);
  const [error,       setError]       = useState('');

  const handleSignIn = async () => {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true); setError('');
    const { error: e } = await signIn(email, password);
    if (e) setError(e.message);
    setLoading(false);
  };

  const handleGoogle = async () => {
    setOAuthLoading('google'); setError('');
    const { error: e } = await signInWithGoogle();
    if (e) setError(e.message);
    setOAuthLoading(null);
  };

  const handleApple = async () => {
    setOAuthLoading('apple'); setError('');
    const { error: e } = await signInWithApple();
    if (e) setError(e.message);
    setOAuthLoading(null);
  };

  return (
    <View style={styles.loginContainer}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>W</Text>
      </View>
      <Text style={styles.loginTitle}>Sign in to WANKONG</Text>
      <Text style={styles.loginSub}>Access your creator dashboard</Text>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* OAuth buttons */}
      <TouchableOpacity
        style={styles.oauthBtn}
        onPress={handleGoogle}
        disabled={!!oauthLoading}
      >
        {oauthLoading === 'google'
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.oauthBtnText}>🌐  Continue with Google</Text>}
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.oauthBtn, styles.appleBtn]}
          onPress={handleApple}
          disabled={!!oauthLoading}
        >
          {oauthLoading === 'apple'
            ? <ActivityIndicator color="#000" />
            : <Text style={[styles.oauthBtnText, { color: '#000' }]}>🍎  Continue with Apple</Text>}
        </TouchableOpacity>
      )}

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or email</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn} disabled={loading}>
        {loading ? <ActivityIndicator color="#0A1128" /> : <Text style={styles.signInBtnText}>Sign In</Text>}
      </TouchableOpacity>
      <Text style={styles.socialNote}>Phone login — coming soon</Text>
    </View>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <View style={[styles.statCard, { borderColor: colour + '30' }]}>
      <Text style={[styles.statValue, { color: colour }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }: { navigation?: any }) {
  const { user, signOut } = useAuth();
  const [levelData,   setLevelData]   = useState<CreatorLevel | null>(null);
  const [earnings,    setEarnings]    = useState<EarningRow[]>([]);
  const [followCount, setFollowCount] = useState(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [totalEarn,   setTotalEarn]   = useState(0);
  const [distStatus,  setDistStatus]  = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const uid = user.id;

    const [levelRes, earningRes, followRes, uploadRes, distRes] = await Promise.all([
      supabase.from('creator_levels').select('level,xp').eq('user_id', uid).maybeSingle(),
      supabase.from('creator_earnings').select('category,amount').eq('user_id', uid),
      supabase.from('artist_followers').select('*', { count: 'exact', head: true }).eq('artist_id', uid),
      supabase.from('tracks').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('distribution_releases').select('status').eq('user_id', uid).order('created_at', { ascending: false }).limit(1),
    ]);

    setLevelData(levelRes.data as CreatorLevel | null);

    const rows = (earningRes.data ?? []) as EarningRow[];
    const grouped: Record<string, number> = {};
    rows.forEach(r => { grouped[r.category] = (grouped[r.category] ?? 0) + r.amount; });
    const sorted = Object.entries(grouped).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
    setEarnings(sorted.slice(0, 4));
    setTotalEarn(rows.reduce((s, r) => s + r.amount, 0));

    setFollowCount(followRes.count ?? 0);
    setUploadCount(uploadRes.count ?? 0);
    setDistStatus((distRes.data?.[0] as any)?.status ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) return <LoginView />;

  const initial = (user.email?.[0] ?? 'W').toUpperCase();
  const level   = levelData?.level ?? 'Bronze';
  const xp      = levelData?.xp ?? 0;
  const { pct, max } = getXPProgress(level, xp);
  const nextLvl = getNextLevel(level);
  const lvlColour = getLevelColour(level);
  const maxEarn = Math.max(...earnings.map(e => e.amount), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.creatorLabel}>Creator</Text>
      </View>

      {/* Creator Level */}
      <View style={[styles.card, { borderColor: lvlColour + '40' }]}>
        <View style={styles.levelHeader}>
          <Text style={[styles.levelName, { color: lvlColour }]}>{level}</Text>
          <Text style={styles.xpText}>{xp.toLocaleString()} XP</Text>
        </View>
        {nextLvl && (
          <>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: lvlColour }]} />
            </View>
            <Text style={styles.nextLevelText}>
              {(max - xp).toLocaleString()} XP to {nextLvl}
            </Text>
          </>
        )}
      </View>

      {/* Stats row */}
      {loading ? (
        <ActivityIndicator color={CYAN} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.statsRow}>
          <StatCard label="Followers" value={formatCount(followCount)} colour={CYAN}   />
          <StatCard label="Uploads"   value={formatCount(uploadCount)} colour={PURPLE} />
          <StatCard label="Earned"    value={formatCurrency(totalEarn)} colour={GOLD}  />
        </View>
      )}

      {/* Earnings breakdown */}
      {earnings.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Earnings (Last 30 days)</Text>
          {earnings.map(e => (
            <View key={e.category} style={styles.earnRow}>
              <Text style={styles.earnLabel}>{CATEGORY_LABEL[e.category] ?? e.category}</Text>
              <View style={styles.earnBarBg}>
                <View style={[styles.earnBarFill, { width: `${(e.amount / maxEarn) * 100}%` as any }]} />
              </View>
              <Text style={styles.earnAmount}>{formatCurrency(e.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Distribution status */}
      {distStatus && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Latest Distribution</Text>
          <View style={[styles.statusBadge, { backgroundColor: distStatus === 'live' ? GREEN + '20' : GOLD + '20' }]}>
            <Text style={[styles.statusText, { color: distStatus === 'live' ? GREEN : GOLD }]}>
              {distStatus.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* Quick links */}
      <TouchableOpacity
        style={styles.navBtn}
        onPress={() => navigation?.navigate('Earnings')}
      >
        <Text style={styles.navBtnIcon}>💰</Text>
        <Text style={styles.navBtnText}>Earnings Dashboard</Text>
        <Text style={styles.navBtnArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navBtn}
        onPress={() => navigation?.navigate('Membership')}
      >
        <Text style={styles.navBtnIcon}>💎</Text>
        <Text style={styles.navBtnText}>Memberships</Text>
        <Text style={styles.navBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: NAVY },
  content:           { padding: 16, paddingBottom: 100 },
  loginContainer:    { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoCircle:        { width: 72, height: 72, borderRadius: 20, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoText:          { color: NAVY, fontWeight: '900', fontSize: 28 },
  loginTitle:        { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  loginSub:          { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 },
  errorText:         { color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input:             { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 15, marginBottom: 12 },
  signInBtn:         { width: '100%', backgroundColor: CYAN, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  signInBtnText:     { color: NAVY, fontWeight: '800', fontSize: 16 },
  oauthBtn:          { width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  appleBtn:          { backgroundColor: '#fff' },
  oauthBtnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  dividerRow:        { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 16, gap: 10 },
  dividerLine:       { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText:       { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  socialNote:        { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 20 },
  avatarSection:     { alignItems: 'center', paddingVertical: 24 },
  avatar:            { width: 80, height: 80, borderRadius: 40, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitial:     { color: '#fff', fontSize: 32, fontWeight: '900' },
  email:             { color: '#fff', fontSize: 16, fontWeight: '600' },
  creatorLabel:      { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
  card:              { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  levelHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  levelName:         { fontWeight: '800', fontSize: 18 },
  xpText:            { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  progressBg:        { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill:      { height: 6, borderRadius: 3 },
  nextLevelText:     { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6 },
  statsRow:          { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:          { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1 },
  statValue:         { fontSize: 20, fontWeight: '800' },
  statLabel:         { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  sectionTitle:      { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 14 },
  earnRow:           { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  earnLabel:         { color: 'rgba(255,255,255,0.6)', fontSize: 12, width: 100 },
  earnBarBg:         { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  earnBarFill:       { height: 6, borderRadius: 3, backgroundColor: CYAN },
  earnAmount:        { color: GREEN, fontSize: 12, fontWeight: '700', width: 56, textAlign: 'right' },
  statusBadge:       { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  statusText:        { fontWeight: '700', fontSize: 12 },
  navBtn:            { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  navBtnIcon:        { fontSize: 18, marginRight: 12 },
  navBtnText:        { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },
  navBtnArrow:       { color: 'rgba(255,255,255,0.3)', fontSize: 20 },
  signOutBtn:        { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  signOutText:       { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 14 },
});
