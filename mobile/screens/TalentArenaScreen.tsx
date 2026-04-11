import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCount } from '../utils/formatters';

// ── Colour constants ────────────────────────────────────────────────────────────
const NAVY   = '#0A1128';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SUBTITLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'yo', name: 'Yoruba', flag: '🌍' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'pid', name: 'Pidgin', flag: '🌍' },
  { code: 'bm', name: 'Bamumbu', flag: '🌍' },
];

const COVER_COLOURS: [string, string][] = [
  [PURPLE, CYAN],
  [ORANGE, GOLD],
  [GREEN,  CYAN],
  [PURPLE, ORANGE],
  [GOLD,   PURPLE],
  [CYAN,   GREEN],
  [ORANGE, PURPLE],
  [GREEN,  GOLD],
];

function getColourPair(id: string): [string, string] {
  const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COVER_COLOURS[hash % COVER_COLOURS.length];
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompetitionRoom {
  id: string;
  title: string;
  category: string;
  status: string;
  prize_amount?: number;
  prize_currency?: string;
  prize_description?: string;
  entry_deadline?: string;
  entry_count?: number;
}

interface CompetitionEntry {
  id: string;
  room_id: string;
  user_id: string;
  title: string;
  video_url: string;
  votes_count: number;
  ai_score?: number;
  status: string;
  performer_name?: string;
  language?: string;
}

interface VotesMap {
  [entryId: string]: number;
}

interface SubtitleMap {
  [entryId: string]: { lang: string; vtt_url: string } | null;
}

type TabType = 'rooms' | 'leaderboard';

// ── Countdown Timer ────────────────────────────────────────────────────────────

function useCountdown(deadline?: string): string {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!deadline) {
      setRemaining('No deadline');
      return;
    }

    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Ended');
        return;
      }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (d > 0) setRemaining(`${d}d ${h}h ${m}m ${s}s`);
      else setRemaining(`${h}h ${m}m ${s}s`);
    };

    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [deadline]);

  return remaining;
}

// ── Room Card ──────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  selected,
  onWatch,
  onEnter,
}: {
  room: CompetitionRoom;
  selected: boolean;
  onWatch: () => void;
  onEnter: () => void;
}) {
  const countdown = useCountdown(room.entry_deadline);
  const [c1] = getColourPair(room.id);

  return (
    <View style={[styles.roomCard, selected && styles.roomCardSelected]}>
      <View style={styles.roomCardHeader}>
        <View style={[styles.roomDot, { backgroundColor: c1 }]} />
        <View style={[styles.categoryPill, { backgroundColor: PURPLE }]}>
          <Text style={styles.categoryPillText}>{room.category}</Text>
        </View>
        <View style={styles.roomStatusBadge}>
          <Text style={styles.roomStatusText}>{room.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.roomTitle}>{room.title}</Text>

      {room.prize_description ? (
        <Text style={styles.roomPrize}>🏆 {room.prize_description}</Text>
      ) : room.prize_amount != null ? (
        <Text style={styles.roomPrize}>
          🏆 {room.prize_currency ?? 'USD'} {room.prize_amount.toLocaleString()} Prize
        </Text>
      ) : null}

      <View style={styles.roomMeta}>
        <Text style={styles.roomMetaText}>⏱ {countdown}</Text>
        {room.entry_count != null && (
          <Text style={styles.roomMetaText}>👥 {room.entry_count} entries</Text>
        )}
      </View>

      <View style={styles.roomActions}>
        <TouchableOpacity style={styles.watchBtn} onPress={onWatch} activeOpacity={0.8}>
          <Text style={styles.watchBtnText}>👁 Watch</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.enterBtn} onPress={onEnter} activeOpacity={0.8}>
          <Text style={styles.enterBtnText}>+ Enter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Entry Card ─────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  rank,
  onVote,
  hasVoted,
  votesOverride,
  subtitle,
  onSubtitle,
}: {
  entry: CompetitionEntry;
  rank: number;
  onVote: () => void;
  hasVoted: boolean;
  votesOverride?: number;
  subtitle?: { lang: string; vtt_url: string } | null;
  onSubtitle: () => void;
}) {
  const [c1, c2] = getColourPair(entry.id);
  const votes = votesOverride ?? entry.votes_count ?? 0;

  return (
    <View style={[styles.entryCard, rank === 1 && styles.entryCardFirst]}>
      {/* 16:9 thumbnail placeholder */}
      <View style={[styles.entryThumb, { backgroundColor: c1 }]}>
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: c2, opacity: 0.35, borderRadius: 10 },
          ]}
        />
        <Text style={styles.entryThumbIcon}>🎬</Text>
        <View style={styles.entryRankBadgeOverlay}>
          <Text style={styles.entryRankText}>#{rank}</Text>
        </View>
      </View>

      <View style={styles.entryBody}>
        <View style={styles.entryBodyTop}>
          <View style={styles.entryInfo}>
            <Text style={styles.entryTitle} numberOfLines={2}>{entry.title}</Text>
            <Text style={styles.entryPerformer}>{entry.performer_name ?? 'Anonymous'}</Text>
          </View>
          <View style={styles.entryRight}>
            <View style={styles.votesBadge}>
              <Text style={styles.votesCount}>{formatCount(votes)}</Text>
              <Text style={styles.votesLabel}>votes</Text>
            </View>
            {entry.ai_score != null && (
              <View style={styles.aiScoreBadge}>
                <Text style={styles.aiScoreText}>AI {entry.ai_score}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.entryActions}>
          <TouchableOpacity
            style={[styles.voteBtn, hasVoted && styles.voteBtnVoted]}
            onPress={onVote}
            disabled={hasVoted}
            activeOpacity={0.8}
          >
            <Text style={styles.voteBtnText}>{hasVoted ? '❤ Voted' : '🤍 VOTE'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subtitleBtn}
            onPress={onSubtitle}
            activeOpacity={0.8}
          >
            {subtitle ? (
              <Text style={styles.subtitleActiveText}>CC: {subtitle.lang.toUpperCase()}</Text>
            ) : (
              <Text style={styles.subtitleBtnText}>CC</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function TalentArenaScreen() {
  const { user } = useAuth();

  const [activeTab, setActiveTab]           = useState<TabType>('rooms');
  const [rooms, setRooms]                   = useState<CompetitionRoom[]>([]);
  const [selectedRoom, setSelectedRoom]     = useState<CompetitionRoom | null>(null);
  const [entries, setEntries]               = useState<CompetitionEntry[]>([]);
  const [allEntries, setAllEntries]         = useState<CompetitionEntry[]>([]);
  const [votedIds, setVotedIds]             = useState<Set<string>>(new Set());
  const [votesMap, setVotesMap]             = useState<VotesMap>({});
  const [subtitleMap, setSubtitleMap]       = useState<SubtitleMap>({});
  const [loadingRooms, setLoadingRooms]     = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [langModalVisible, setLangModalVisible]   = useState(false);
  const [subtitleEntryId, setSubtitleEntryId]     = useState<string | null>(null);
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string | null>(null);

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch rooms ──────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    const { data, error } = await supabase
      .from('competition_rooms')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setRooms(data as CompetitionRoom[]);
    }
    setLoadingRooms(false);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // ── Fetch all entries for leaderboard tab ────────────────────────────────────
  const fetchAllEntries = useCallback(async () => {
    if (rooms.length === 0) return;
    const roomIds = rooms.map((r) => r.id);
    const { data } = await supabase
      .from('competition_entries_v2')
      .select('*')
      .in('room_id', roomIds)
      .order('votes_count', { ascending: false });
    if (data) setAllEntries(data as CompetitionEntry[]);
  }, [rooms]);

  useEffect(() => {
    if (activeTab === 'leaderboard' && rooms.length > 0) {
      fetchAllEntries();
    }
  }, [activeTab, rooms, fetchAllEntries]);

  // ── Fetch entries for selected room ──────────────────────────────────────────
  const fetchEntries = useCallback(async (roomId: string) => {
    setLoadingEntries(true);
    const { data, error } = await supabase
      .from('competition_entries_v2')
      .select('*')
      .eq('room_id', roomId)
      .order('votes_count', { ascending: false });
    if (!error && data) {
      setEntries(data as CompetitionEntry[]);
    }
    setLoadingEntries(false);
  }, []);

  // ── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedRoom) return;

    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    const channel = supabase
      .channel(`arena-votes-${selectedRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'competition_votes',
        },
        (payload) => {
          const vote = payload.new as { entry_id?: string };
          if (!vote.entry_id) return;
          const eid = vote.entry_id;
          setVotesMap((prev) => {
            const current =
              prev[eid] ??
              entries.find((e) => e.id === eid)?.votes_count ??
              0;
            return { ...prev, [eid]: current + 1 };
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [selectedRoom, entries]);

  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  const handleWatchRoom = (room: CompetitionRoom) => {
    setSelectedRoom(room);
    setVotesMap({});
    setActiveTab('rooms');
    fetchEntries(room.id);
  };

  const handleEnterRoom = (room: CompetitionRoom) => {
    Alert.alert(
      'Enter Competition',
      `Upload your entry to "${room.title}" via the Upload tab.`,
      [{ text: 'OK' }]
    );
  };

  // ── Vote ─────────────────────────────────────────────────────────────────────
  const handleVote = async (entry: CompetitionEntry) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please log in to vote.');
      return;
    }
    if (votedIds.has(entry.id)) return;

    // Optimistic update
    setVotedIds((prev) => new Set(prev).add(entry.id));
    setVotesMap((prev) => ({
      ...prev,
      [entry.id]: (prev[entry.id] ?? entry.votes_count ?? 0) + 1,
    }));

    const { error } = await supabase.from('competition_votes').insert({
      entry_id: entry.id,
      user_id: user.id,
      room_id: entry.room_id,
    });

    if (error) {
      // Rollback
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
      setVotesMap((prev) => ({
        ...prev,
        [entry.id]: Math.max(0, (prev[entry.id] ?? entry.votes_count ?? 0) - 1),
      }));
      Alert.alert('Vote Failed', error.message);
    }
  };

  // ── Subtitles ─────────────────────────────────────────────────────────────────
  const openSubtitleModal = (entryId: string) => {
    setSubtitleEntryId(entryId);
    setLangModalVisible(true);
  };

  const handleSelectSubtitleLang = async (langCode: string) => {
    setLangModalVisible(false);
    setSelectedSubtitleLang(langCode);

    if (!subtitleEntryId) return;
    const eid = subtitleEntryId;

    const { data } = await supabase
      .from('competition_subtitles')
      .select('vtt_url, language')
      .eq('entry_id', eid)
      .eq('language', langCode)
      .maybeSingle();

    if (data?.vtt_url) {
      setSubtitleMap((prev) => ({
        ...prev,
        [eid]: { lang: langCode, vtt_url: data.vtt_url },
      }));
    } else {
      setSubtitleMap((prev) => ({ ...prev, [eid]: null }));
    }
    setSubtitleEntryId(null);
  };

  // ── Sorted views ──────────────────────────────────────────────────────────────
  const sortedEntries = [...entries].sort(
    (a, b) =>
      (votesMap[b.id] ?? b.votes_count ?? 0) -
      (votesMap[a.id] ?? a.votes_count ?? 0)
  );

  const leaderboardEntries = [...allEntries].sort(
    (a, b) =>
      (votesMap[b.id] ?? b.votes_count ?? 0) -
      (votesMap[a.id] ?? a.votes_count ?? 0)
  );

  const displayEntries =
    activeTab === 'leaderboard' ? leaderboardEntries : sortedEntries;

  return (
    <View style={styles.container}>
      {/* ── Top tabs ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rooms' && styles.tabActive]}
          onPress={() => setActiveTab('rooms')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'rooms' && styles.tabTextActive]}>
            Rooms
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'leaderboard' && styles.tabTextActive,
            ]}
          >
            Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎭 Talent Arena</Text>
          <Text style={styles.headerSub}>Vote for your favourite creators</Text>
        </View>

        {/* ── Rooms tab content ── */}
        {activeTab === 'rooms' && (
          <>
            <Text style={styles.sectionLabel}>Open Competitions</Text>
            {loadingRooms ? (
              <ActivityIndicator color={CYAN} style={styles.loader} />
            ) : (
              <FlatList
                data={rooms}
                keyExtractor={(r) => r.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.roomsList}
                renderItem={({ item }) => (
                  <RoomCard
                    room={item}
                    selected={selectedRoom?.id === item.id}
                    onWatch={() => handleWatchRoom(item)}
                    onEnter={() => handleEnterRoom(item)}
                  />
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No open competitions right now</Text>
                }
              />
            )}

            {selectedRoom && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionLabel}>
                    Entries — {selectedRoom.title}
                  </Text>
                </View>
                {loadingEntries ? (
                  <ActivityIndicator color={PURPLE} style={styles.loader} />
                ) : sortedEntries.length === 0 ? (
                  <Text style={styles.emptyText}>No entries yet. Be the first!</Text>
                ) : (
                  sortedEntries.map((entry, idx) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      rank={idx + 1}
                      onVote={() => handleVote(entry)}
                      hasVoted={votedIds.has(entry.id)}
                      votesOverride={votesMap[entry.id]}
                      subtitle={subtitleMap[entry.id]}
                      onSubtitle={() => openSubtitleModal(entry.id)}
                    />
                  ))
                )}
              </>
            )}
          </>
        )}

        {/* ── Leaderboard tab content ── */}
        {activeTab === 'leaderboard' && (
          <>
            <Text style={styles.sectionLabel}>Global Leaderboard</Text>
            {leaderboardEntries.length === 0 ? (
              <ActivityIndicator color={CYAN} style={styles.loader} />
            ) : (
              leaderboardEntries.map((entry, idx) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  rank={idx + 1}
                  onVote={() => handleVote(entry)}
                  hasVoted={votedIds.has(entry.id)}
                  votesOverride={votesMap[entry.id]}
                  subtitle={subtitleMap[entry.id]}
                  onSubtitle={() => openSubtitleModal(entry.id)}
                />
              ))
            )}
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* ── Subtitle language modal ── */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.langSheet}>
            <View style={styles.langSheetHandle} />
            <Text style={styles.langSheetTitle}>Select Subtitle Language</Text>
            <ScrollView>
              {SUBTITLE_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langOption,
                    selectedSubtitleLang === lang.code && styles.langOptionActive,
                  ]}
                  onPress={() => handleSelectSubtitleLang(lang.code)}
                >
                  <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.langOptionText,
                      selectedSubtitleLang === lang.code && styles.langOptionTextActive,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {selectedSubtitleLang === lang.code && (
                    <Text style={styles.langCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: NAVY,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: CYAN,
  },
  tabText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: CYAN,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 140 },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 4,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loader: { marginVertical: 20 },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20,
    fontSize: 13,
    marginBottom: 8,
  },
  // Rooms list
  roomsList: { paddingHorizontal: 16, paddingBottom: 4 },
  roomCard: {
    width: SCREEN_WIDTH * 0.72,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roomCardSelected: {
    borderColor: CYAN,
    borderWidth: 2,
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  roomDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flex: 1,
  },
  categoryPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roomStatusBadge: {
    backgroundColor: GREEN,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roomStatusText: {
    color: NAVY,
    fontSize: 10,
    fontWeight: '800',
  },
  roomTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  roomPrize: {
    color: GOLD,
    fontSize: 13,
    marginBottom: 8,
  },
  roomMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  roomMetaText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  roomActions: {
    flexDirection: 'row',
    gap: 10,
  },
  watchBtn: {
    flex: 1,
    backgroundColor: CYAN,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  watchBtnText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '700',
  },
  enterBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  enterBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Entry card
  entryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  entryCardFirst: {
    borderColor: GOLD,
    backgroundColor: 'rgba(255,184,0,0.06)',
  },
  entryThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  entryThumbIcon: { fontSize: 40 },
  entryRankBadgeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  entryRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  entryBody: {
    padding: 12,
  },
  entryBodyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  entryInfo: { flex: 1, marginRight: 8 },
  entryTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  entryPerformer: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 3,
  },
  entryRight: { alignItems: 'flex-end', gap: 4 },
  votesBadge: {
    backgroundColor: 'rgba(157,78,221,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  votesCount: {
    color: PURPLE,
    fontSize: 16,
    fontWeight: '800',
  },
  votesLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
  },
  aiScoreBadge: {
    backgroundColor: 'rgba(0,245,160,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiScoreText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '700',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  voteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: ORANGE,
  },
  voteBtnVoted: {
    backgroundColor: 'rgba(255,107,0,0.3)',
  },
  voteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  subtitleBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  subtitleActiveText: {
    color: CYAN,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomPad: { height: 20 },
  // Lang modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  langSheet: {
    backgroundColor: '#131D3A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
  },
  langSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  langSheetTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  langOptionActive: {
    backgroundColor: 'rgba(0,217,255,0.08)',
  },
  langOptionFlag: {
    fontSize: 18,
    marginRight: 12,
  },
  langOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    flex: 1,
  },
  langOptionTextActive: { color: CYAN, fontWeight: '700' },
  langCheckmark: { color: CYAN, fontSize: 16 },
});
