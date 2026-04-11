import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalPlayer, Track } from '../contexts/GlobalPlayerContext';
import { isAudioCached } from '../utils/offlineCache';
import type { LibraryStackParamList } from '../navigation/BottomTabNavigator';

const COVER_COLOURS: [string, string][] = [
  ['#9D4EDD', '#00D9FF'],
  ['#FF6B00', '#FFB800'],
  ['#00F5A0', '#00D9FF'],
  ['#9D4EDD', '#FF6B00'],
];

function getColourPair(id: string): [string, string] {
  const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COVER_COLOURS[hash % COVER_COLOURS.length];
}

const LANGUAGES = ['EN', 'FR', 'ES', 'AR', 'SW', 'DE', 'NO', 'SV', 'PT', 'RU', 'ZH', 'JA', 'YO', 'IG', 'HA', 'PID'];
const SAVED_TRACKS_KEY = 'wankong_saved_tracks';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DBTrack {
  id: string;
  title: string;
  audio_url: string;
  stream_count: number;
  genre?: string;
  user_id: string;
}

interface EcomProduct {
  id: string;
  title: string;
  price: number;
  product_type: string;
  language?: string;
  image_url?: string;
}

interface AudiobookRow {
  id: string;
  title: string;
  narrator: string;
  language: string;
  cover_url?: string;
}

interface ArtistFollow {
  id: string;
  followed_at: string;
  artists?: {
    id: string;
    name: string;
    verified: boolean;
  };
}

// ── Tab labels ─────────────────────────────────────────────────────────────────

type LibraryTab = 'Music' | 'Books' | 'Audiobooks' | 'Artists' | 'Languages';
const TABS: LibraryTab[] = ['Music', 'Books', 'Audiobooks', 'Artists', 'Languages'];

// ── Music Tab ──────────────────────────────────────────────────────────────────

function MusicTab() {
  const { user } = useAuth();
  const { play } = useGlobalPlayer();
  const [tracks, setTracks] = useState<DBTrack[]>([]);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchSavedTracks = useCallback(async () => {
    setLoading(true);
    try {
      // Get saved track IDs from AsyncStorage
      const savedRaw = await AsyncStorage.getItem(SAVED_TRACKS_KEY);
      const savedIds: string[] = savedRaw ? JSON.parse(savedRaw) : [];

      if (savedIds.length > 0) {
        const { data } = await supabase
          .from('tracks')
          .select('*')
          .in('id', savedIds);
        if (data) setTracks(data as DBTrack[]);
      }

      // Also fetch user's own tracks if logged in
      if (user) {
        const { data: ownTracks } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (ownTracks) {
          setTracks((prev) => {
            const ids = new Set(prev.map((t) => t.id));
            const newTracks = (ownTracks as DBTrack[]).filter((t) => !ids.has(t.id));
            return [...prev, ...newTracks];
          });
        }
      }

      // Check offline availability
      const cacheChecks = await Promise.all(
        tracks.map(async (t) => ({ id: t.id, cached: await isAudioCached(t.id) }))
      );
      const cached = new Set(cacheChecks.filter((r) => r.cached).map((r) => r.id));
      setCachedIds(cached);
    } catch (err) {
      console.warn('MusicTab fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, tracks.length]);

  useEffect(() => {
    fetchSavedTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePlay = (track: DBTrack) => {
    const t: Track = {
      id: track.id,
      title: track.title,
      artist: 'Unknown Artist',
      audioUrl: track.audio_url,
    };
    play(t);
  };

  if (loading) return <ActivityIndicator color="#00D9FF" style={{ marginTop: 40 }} />;
  if (tracks.length === 0) {
    return <Text style={styles.emptyText}>No saved tracks yet.{'\n'}Tap a track on the Home screen to play and save it.</Text>;
  }

  return (
    <FlatList
      data={tracks}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item, index }) => {
        const [c1] = getColourPair(item.id);
        const cached = cachedIds.has(item.id);
        return (
          <TouchableOpacity style={styles.listRow} onPress={() => handlePlay(item)} activeOpacity={0.8}>
            <View style={[styles.rowCover, { backgroundColor: c1 }]}>
              <Text style={styles.rowCoverText}>{item.title.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.genre ?? 'Music'}</Text>
            </View>
            {cached && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>⬇ Offline</Text>
              </View>
            )}
            <Text style={styles.playIcon}>▶</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ── Books Tab ──────────────────────────────────────────────────────────────────

function BooksTab() {
  const { user } = useAuth();
  const [books, setBooks] = useState<EcomProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('ecom_products')
      .select('*')
      .eq('author_id', user.id)
      .eq('product_type', 'Book')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBooks(data as EcomProduct[]);
        setLoading(false);
      });
  }, [user]);

  if (!user) return <Text style={styles.emptyText}>Sign in to see your books.</Text>;
  if (loading) return <ActivityIndicator color="#00D9FF" style={{ marginTop: 40 }} />;
  if (books.length === 0) return <Text style={styles.emptyText}>No books uploaded yet.</Text>;

  return (
    <FlatList
      data={books}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const [c1] = getColourPair(item.id);
        return (
          <View style={styles.listRow}>
            <View style={[styles.rowCover, { backgroundColor: c1 }]}>
              <Text style={{ fontSize: 24 }}>📚</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowMeta}>${item.price?.toFixed(2) ?? '0.00'} · {item.language ?? 'EN'}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

// ── Audiobooks Tab ─────────────────────────────────────────────────────────────

function AudiobooksTab() {
  const { user } = useAuth();
  const [audiobooks, setAudiobooks] = useState<AudiobookRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('audiobooks')
      .select('*')
      .eq('author_id', user.id)
      .then(({ data }) => {
        if (data) setAudiobooks(data as AudiobookRow[]);
        setLoading(false);
      });
  }, [user]);

  if (!user) return <Text style={styles.emptyText}>Sign in to see your audiobooks.</Text>;
  if (loading) return <ActivityIndicator color="#00D9FF" style={{ marginTop: 40 }} />;
  if (audiobooks.length === 0) return <Text style={styles.emptyText}>No audiobooks yet.</Text>;

  return (
    <FlatList
      data={audiobooks}
      keyExtractor={(a) => a.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const [c1] = getColourPair(item.id);
        return (
          <View style={styles.listRow}>
            <View style={[styles.rowCover, { backgroundColor: c1 }]}>
              <Text style={{ fontSize: 24 }}>🎧</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.narrator} · {item.language}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

// ── Artists Tab ────────────────────────────────────────────────────────────────

function ArtistsTab() {
  const { user } = useAuth();
  const [follows, setFollows] = useState<ArtistFollow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from('artist_followers')
      .select('id, followed_at, artists(id, name, verified)')
      .eq('follower_id', user.id)
      .order('followed_at', { ascending: false })
      .then(({ data }) => {
        if (data) setFollows(data as ArtistFollow[]);
        setLoading(false);
      });
  }, [user]);

  if (!user) return <Text style={styles.emptyText}>Sign in to see followed artists.</Text>;
  if (loading) return <ActivityIndicator color="#00D9FF" style={{ marginTop: 40 }} />;
  if (follows.length === 0) return <Text style={styles.emptyText}>You haven't followed any artists yet.</Text>;

  return (
    <FlatList
      data={follows}
      keyExtractor={(f) => f.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const artist = item.artists;
        if (!artist) return null;
        const [c1] = getColourPair(artist.id);
        return (
          <View style={styles.listRow}>
            <View style={[styles.rowAvatarCircle, { backgroundColor: c1 }]}>
              <Text style={styles.rowCoverText}>{artist.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{artist.name}</Text>
              {artist.verified && <Text style={styles.verifiedText}>✓ Verified</Text>}
            </View>
          </View>
        );
      }}
    />
  );
}

// ── Languages Tab ──────────────────────────────────────────────────────────────

function LanguagesTab({ onNavigate }: { onNavigate: (lang: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.langGrid}>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang}
          style={styles.langChip}
          onPress={() => onNavigate(lang)}
          activeOpacity={0.8}
        >
          <Text style={styles.langText}>{lang}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const navigation = useNavigation<StackNavigationProp<LibraryStackParamList>>();
  const [activeTab, setActiveTab] = useState<LibraryTab>('Music');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'Music' && <MusicTab />}
        {activeTab === 'Books' && <BooksTab />}
        {activeTab === 'Audiobooks' && <AudiobooksTab />}
        {activeTab === 'Artists' && <ArtistsTab />}
        {activeTab === 'Languages' && (
          <LanguagesTab onNavigate={(lang) => navigation.navigate('Language', { language: lang })} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1128' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabBarContent: {
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00D9FF',
  },
  tabText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: { color: '#00D9FF' },
  content: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 140 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowCoverText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  rowInfo: { flex: 1 },
  rowTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  rowMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  offlineBadge: {
    backgroundColor: 'rgba(0,245,160,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  offlineBadgeText: { color: '#00F5A0', fontSize: 10, fontWeight: '600' },
  playIcon: { color: '#00D9FF', fontSize: 16 },
  verifiedText: { color: '#00D9FF', fontSize: 11, marginTop: 2 },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 14,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingBottom: 140,
    gap: 10,
  },
  langChip: {
    backgroundColor: 'rgba(0,217,255,0.1)',
    borderColor: 'rgba(0,217,255,0.3)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  langText: { color: '#00D9FF', fontSize: 14, fontWeight: '600' },
});
