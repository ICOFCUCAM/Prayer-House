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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LANGUAGES = ['EN', 'FR', 'NO', 'SW', 'DE', 'ES', 'AR', 'ZH', 'ZU', 'BM', 'LG', 'RU', 'PID', 'YO', 'PT', 'SV'];

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

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompetitionRoom {
  id: string;
  title: string;
  category: string;
  status: string;
  prize_amount?: number;
  prize_currency?: string;
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
  status: string;
  performer_name?: string;
  language?: string;
}

interface VotesMap {
  [entryId: string]: number;
}

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
      if (d > 0) setRemaining(`${d}d ${h}h ${m}m`);
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
    <View style={[styles.roomCard, selected && { borderColor: '#00D9FF', borderWidth: 2 }]}>
      <View style={styles.roomCardHeader}>
        <View style={[styles.roomDot, { backgroundColor: c1 }]} />
        <Text style={styles.roomCategory}>{room.category}</Text>
        <View style={styles.roomStatusBadge}>
          <Text style={styles.roomStatusText}>{room.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.roomTitle}>{room.title}</Text>

      {room.prize_amount != null && (
        <Text style={styles.roomPrize}>
          🏆 {room.prize_currency ?? 'USD'} {room.prize_amount.toLocaleString()} Prize
        </Text>
      )}

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
}: {
  entry: CompetitionEntry;
  rank: number;
  onVote: () => void;
  hasVoted: boolean;
  votesOverride?: number;
}) {
  const [c1] = getColourPair(entry.id);
  const votes = votesOverride ?? entry.votes_count ?? 0;

  return (
    <View style={[styles.entryCard, rank === 1 && styles.entryCardFirst]}>
      <View style={styles.entryRankBadge}>
        <Text style={styles.entryRankText}>#{rank}</Text>
      </View>

      <View style={[styles.entryThumb, { backgroundColor: c1 }]}>
        <Text style={styles.entryThumbText}>🎬</Text>
      </View>

      <View style={styles.entryInfo}>
        <Text style={styles.entryTitle} numberOfLines={2}>{entry.title}</Text>
        <Text style={styles.entryPerformer}>{entry.performer_name ?? 'Anonymous'}</Text>
        {entry.language && <Text style={styles.entryLang}>{entry.language}</Text>}
      </View>

      <View style={styles.entryRight}>
        <Text style={styles.entryVotes}>{formatCount(votes)}</Text>
        <Text style={styles.entryVotesLabel}>votes</Text>
        <TouchableOpacity
          style={[styles.voteBtn, hasVoted && styles.voteBtnActive]}
          onPress={onVote}
          disabled={hasVoted}
          activeOpacity={0.8}
        >
          <Text style={styles.voteBtnText}>{hasVoted ? '❤' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function TalentArenaScreen() {
  const { user } = useAuth();

  const [rooms, setRooms] = useState<CompetitionRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<CompetitionRoom | null>(null);
  const [entries, setEntries] = useState<CompetitionEntry[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [votesMap, setVotesMap] = useState<VotesMap>({});
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [subtitleEntryId, setSubtitleEntryId] = useState<string | null>(null);

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

    // Cleanup previous subscription
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
          const vote = payload.new as { entry_id?: string; votes_count?: number };
          if (!vote.entry_id) return;
          setVotesMap((prev) => {
            const current = prev[vote.entry_id!] ?? entries.find(e => e.id === vote.entry_id)?.votes_count ?? 0;
            return { ...prev, [vote.entry_id!]: current + 1 };
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

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
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

  // ── Subtitle language select ─────────────────────────────────────────────────
  const openLangModal = (entryId: string) => {
    setSubtitleEntryId(entryId);
    setLangModalVisible(true);
  };

  const handleSelectLang = (lang: string) => {
    setSelectedLang(lang);
    setLangModalVisible(false);
  };

  // Sorted entries (leaderboard)
  const sortedEntries = [...entries].sort(
    (a, b) => (votesMap[b.id] ?? b.votes_count ?? 0) - (votesMap[a.id] ?? a.votes_count ?? 0)
  );

  return (
    <View style={styles.container}>
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

        {/* ── Rooms ── */}
        <Text style={styles.sectionTitle}>Open Competitions</Text>
        {loadingRooms ? (
          <ActivityIndicator color="#00D9FF" style={styles.loader} />
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

        {/* ── Entries / Leaderboard ── */}
        {selectedRoom && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>
                Leaderboard — {selectedRoom.title}
              </Text>
            </View>

            {loadingEntries ? (
              <ActivityIndicator color="#9D4EDD" style={styles.loader} />
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
                />
              ))
            )}
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* ── Language Modal ── */}
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
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.langOption,
                    selectedLang === lang && styles.langOptionActive,
                  ]}
                  onPress={() => handleSelectLang(lang)}
                >
                  <Text
                    style={[
                      styles.langOptionText,
                      selectedLang === lang && styles.langOptionTextActive,
                    ]}
                  >
                    {lang}
                  </Text>
                  {selectedLang === lang && (
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
  container: { flex: 1, backgroundColor: '#0A1128' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 140 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  sectionTitle: {
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
  roomsList: { paddingHorizontal: 16 },
  roomCard: {
    width: SCREEN_WIDTH * 0.72,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  roomCategory: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roomStatusBadge: {
    backgroundColor: '#00F5A0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roomStatusText: {
    color: '#0A1128',
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
    color: '#FFB800',
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
    backgroundColor: 'rgba(0,217,255,0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
  },
  watchBtnText: {
    color: '#00D9FF',
    fontSize: 14,
    fontWeight: '600',
  },
  enterBtn: {
    flex: 1,
    backgroundColor: '#9D4EDD',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  enterBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Entry card
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  entryCardFirst: {
    borderColor: '#FFB800',
    backgroundColor: 'rgba(255,184,0,0.08)',
  },
  entryRankBadge: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
  },
  entryRankText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
  },
  entryThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryThumbText: { fontSize: 28 },
  entryInfo: { flex: 1, marginRight: 8 },
  entryTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  entryPerformer: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 3,
  },
  entryLang: {
    color: '#FFB800',
    fontSize: 10,
    marginTop: 2,
  },
  entryRight: { alignItems: 'center', minWidth: 60 },
  entryVotes: {
    color: '#9D4EDD',
    fontSize: 15,
    fontWeight: '800',
  },
  entryVotesLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
  },
  voteBtn: {
    marginTop: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(157,78,221,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteBtnActive: {
    backgroundColor: 'rgba(157,78,221,0.4)',
  },
  voteBtnText: { fontSize: 18 },
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
  langOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    flex: 1,
  },
  langOptionTextActive: { color: '#00D9FF', fontWeight: '700' },
  langCheckmark: { color: '#00D9FF', fontSize: 16 },
});
