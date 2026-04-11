import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { useGlobalPlayer, Track } from '../contexts/GlobalPlayerContext';
import { formatCount } from '../utils/formatters';
import type { HomeStackParamList } from '../navigation/BottomTabNavigator';

// ── Colour constants ────────────────────────────────────────────────────────────
const NAVY   = '#0A1128';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Gradient colour pairs by index ─────────────────────────────────────────────
const GRAD_PAIRS: [string, string][] = [
  [PURPLE, CYAN],
  [ORANGE, GOLD],
  [GREEN,  CYAN],
  [PURPLE, ORANGE],
  [GOLD,   PURPLE],
  [CYAN,   GREEN],
  [ORANGE, PURPLE],
  [GREEN,  GOLD],
];

function gradPair(index: number): [string, string] {
  return GRAD_PAIRS[index % GRAD_PAIRS.length];
}

// ── Language data ───────────────────────────────────────────────────────────────
interface LangItem {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: LangItem[] = [
  { code: 'en',  name: 'English',    flag: '🇬🇧' },
  { code: 'fr',  name: 'French',     flag: '🇫🇷' },
  { code: 'es',  name: 'Spanish',    flag: '🇪🇸' },
  { code: 'ar',  name: 'Arabic',     flag: '🇸🇦' },
  { code: 'sw',  name: 'Swahili',    flag: '🇰🇪' },
  { code: 'de',  name: 'German',     flag: '🇩🇪' },
  { code: 'no',  name: 'Norwegian',  flag: '🇳🇴' },
  { code: 'sv',  name: 'Swedish',    flag: '🇸🇪' },
  { code: 'pt',  name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru',  name: 'Russian',    flag: '🇷🇺' },
  { code: 'zh',  name: 'Chinese',    flag: '🇨🇳' },
  { code: 'yo',  name: 'Yoruba',     flag: '🌍' },
  { code: 'ig',  name: 'Igbo',       flag: '🇳🇬' },
  { code: 'ha',  name: 'Hausa',      flag: '🇳🇬' },
  { code: 'pid', name: 'Pidgin',     flag: '🌍' },
  { code: 'bm',  name: 'Bamumbu',    flag: '🌍' },
];

// ── Types ───────────────────────────────────────────────────────────────────────
interface DBTrack {
  id: string;
  title: string;
  audio_url: string;
  stream_count: number;
  genre?: string;
  user_id: string;
  artist_name?: string;
}

interface CompetitionEntry {
  id: string;
  title: string;
  votes_count: number;
  status: string;
  performer_name?: string;
}

interface Artist {
  id: string;
  name: string;
  verified: boolean;
  streams: number;
}

interface AudiobookRow {
  id: string;
  title: string;
  narrator: string;
  language: string;
}

// ── Sub-components ──────────────────────────────────────────────────────────────
function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function TrackCard({
  track,
  index,
  onPress,
}: {
  track: DBTrack;
  index: number;
  onPress: () => void;
}) {
  const [c1, c2] = gradPair(index);
  return (
    <TouchableOpacity style={styles.trackCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.trackCover, { backgroundColor: c1 }]}>
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: c2, opacity: 0.45, borderRadius: 10 },
          ]}
        />
        <Text style={styles.trackCoverLetter}>
          {track.title.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.trackTitle} numberOfLines={1}>
        {track.title}
      </Text>
      <Text style={styles.trackArtist} numberOfLines={1}>
        {track.artist_name ?? 'Unknown'}
      </Text>
    </TouchableOpacity>
  );
}

function LangChip({
  item,
  onPress,
}: {
  item: LangItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.langChip} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.langFlag}>{item.flag}</Text>
      <Text style={styles.langName}>{item.name}</Text>
    </TouchableOpacity>
  );
}

function ArenaCard({
  entry,
  index,
  onPress,
}: {
  entry: CompetitionEntry;
  index: number;
  onPress: () => void;
}) {
  const [c1, c2] = gradPair(index);
  return (
    <TouchableOpacity style={styles.arenaCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.arenaCover, { backgroundColor: c1 }]}>
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: c2, opacity: 0.4, borderRadius: 8 },
          ]}
        />
        <Text style={styles.arenaCoverIcon}>🎭</Text>
      </View>
      <Text style={styles.arenaTitle} numberOfLines={2}>
        {entry.title}
      </Text>
      <Text style={styles.arenaPerformer} numberOfLines={1}>
        {entry.performer_name ?? 'Performer'}
      </Text>
      <View style={styles.arenaVotesBadge}>
        <Text style={styles.arenaVotesText}>
          ❤ {formatCount(entry.votes_count ?? 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ArtistCard({ artist, index }: { artist: Artist; index: number }) {
  const [c1, c2] = gradPair(index);
  return (
    <View style={styles.artistCard}>
      <View style={[styles.artistAvatar, { backgroundColor: c1 }]}>
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: c2, opacity: 0.4, borderRadius: 30 },
          ]}
        />
        <Text style={styles.artistInitial}>
          {artist.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.artistName} numberOfLines={1}>
        {artist.name}
      </Text>
    </View>
  );
}

function AudiobookCard({
  audiobook,
  index,
}: {
  audiobook: AudiobookRow;
  index: number;
}) {
  const [c1, c2] = gradPair(index);
  return (
    <View style={styles.audiobookCard}>
      <View style={[styles.audiobookCover, { backgroundColor: c1 }]}>
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: c2, opacity: 0.4, borderRadius: 8 },
          ]}
        />
        <Text style={styles.audiobookIcon}>🎧</Text>
      </View>
      <Text style={styles.audiobookTitle} numberOfLines={2}>
        {audiobook.title}
      </Text>
      <Text style={styles.audiobookNarrator} numberOfLines={1}>
        {audiobook.narrator}
      </Text>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>();
  const { play } = useGlobalPlayer();

  const [tracks, setTracks]           = useState<DBTrack[]>([]);
  const [liveEntries, setLiveEntries] = useState<CompetitionEntry[]>([]);
  const [artists, setArtists]         = useState<Artist[]>([]);
  const [audiobooks, setAudiobooks]   = useState<AudiobookRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [tracksRes, entriesRes, artistsRes, audiobooksRes] =
        await Promise.allSettled([
          supabase
            .from('tracks')
            .select('id, title, audio_url, stream_count, genre, user_id, artist_name')
            .order('stream_count', { ascending: false })
            .limit(8),
          supabase
            .from('competition_entries_v2')
            .select('id, title, votes_count, status, performer_name')
            .eq('status', 'live')
            .limit(3),
          supabase
            .from('artists')
            .select('id, name, verified, streams')
            .eq('verified', true)
            .limit(5),
          supabase.from('audiobooks').select('id, title, narrator, language').limit(4),
        ]);

      if (tracksRes.status === 'fulfilled' && tracksRes.value.data) {
        setTracks(tracksRes.value.data as DBTrack[]);
      }
      if (entriesRes.status === 'fulfilled' && entriesRes.value.data) {
        setLiveEntries(entriesRes.value.data as CompetitionEntry[]);
      }
      if (artistsRes.status === 'fulfilled' && artistsRes.value.data) {
        setArtists(artistsRes.value.data as Artist[]);
      }
      if (audiobooksRes.status === 'fulfilled' && audiobooksRes.value.data) {
        setAudiobooks(audiobooksRes.value.data as AudiobookRow[]);
      }
    } catch (err) {
      console.warn('HomeScreen fetchAll error:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handlePlayTrack = (track: DBTrack) => {
    const t: Track = {
      id:       track.id,
      title:    track.title,
      artist:   track.artist_name ?? 'Unknown Artist',
      audioUrl: track.audio_url,
    };
    play(t);
  };

  const goToLanguage = (lang: LangItem) => {
    navigation.navigate('Language', {
      language: lang.code,
    });
  };

  const goToTalentArena = () => {
    // Navigate to Arena tab — handled by bottom tab navigator
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={CYAN}
          colors={[CYAN]}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.logo}>WANKONG</Text>
        <Text style={styles.globe}>🌍</Text>
      </View>

      {/* ── Trending Music ── */}
      <SectionHeader title="Trending Music" onSeeAll={() => {}} />
      {loading ? (
        <ActivityIndicator color={CYAN} style={styles.loader} />
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item, index }) => (
            <TrackCard
              track={item}
              index={index}
              onPress={() => handlePlayTrack(item)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No trending tracks yet</Text>
          }
        />
      )}

      {/* ── Music by Language ── */}
      <SectionHeader title="Music by Language" onSeeAll={() => {}} />
      <FlatList
        data={LANGUAGES}
        keyExtractor={(l) => l.code}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item }) => (
          <LangChip item={item} onPress={() => goToLanguage(item)} />
        )}
      />

      {/* ── Talent Arena Live ── */}
      <SectionHeader title="Talent Arena — Live" onSeeAll={goToTalentArena} />
      {liveEntries.length === 0 && !loading ? (
        <Text style={[styles.emptyText, { paddingHorizontal: 16 }]}>
          No live competitions right now
        </Text>
      ) : (
        <FlatList
          data={liveEntries}
          keyExtractor={(e) => e.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item, index }) => (
            <ArenaCard
              entry={item}
              index={index}
              onPress={goToTalentArena}
            />
          )}
        />
      )}

      {/* ── Featured Artists ── */}
      <SectionHeader title="Featured Artists" onSeeAll={() => {}} />
      <FlatList
        data={artists}
        keyExtractor={(a) => a.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item, index }) => (
          <ArtistCard artist={item} index={index} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No featured artists</Text>
        }
      />

      {/* ── Audiobooks ── */}
      <SectionHeader title="Audiobooks" onSeeAll={() => {}} />
      <FlatList
        data={audiobooks}
        keyExtractor={(ab) => ab.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item, index }) => (
          <AudiobookCard audiobook={item} index={index} />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No audiobooks yet</Text>
        }
      />

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  content: {
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  logo: {
    color: CYAN,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  globe: {
    fontSize: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAll: {
    color: CYAN,
    fontSize: 12,
  },
  loader: {
    marginVertical: 20,
  },
  hList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginBottom: 8,
  },
  // Track card
  trackCard: {
    width: 110,
    marginRight: 12,
  },
  trackCover: {
    width: 72,
    height: 72,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  trackCoverLetter: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
  },
  // Language chip
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,217,255,0.08)',
    borderColor: 'rgba(0,217,255,0.3)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  langFlag: {
    fontSize: 14,
    marginRight: 5,
  },
  langName: {
    color: CYAN,
    fontSize: 13,
    fontWeight: '600',
  },
  // Arena card
  arenaCard: {
    width: 140,
    marginRight: 12,
  },
  arenaCover: {
    width: 140,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  arenaCoverIcon: {
    fontSize: 32,
  },
  arenaTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  arenaPerformer: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
  },
  arenaVotesBadge: {
    marginTop: 4,
    backgroundColor: ORANGE,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  arenaVotesText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Artist card
  artistCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  artistAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  artistInitial: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  artistName: {
    color: CYAN,
    fontSize: 11,
    textAlign: 'center',
  },
  // Audiobook card
  audiobookCard: {
    width: 120,
    marginRight: 12,
  },
  audiobookCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  audiobookIcon: {
    fontSize: 30,
  },
  audiobookTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  audiobookNarrator: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
  },
  bottomPad: {
    height: 20,
  },
});
