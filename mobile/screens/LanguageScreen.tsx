import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useGlobalPlayer } from '../contexts/GlobalPlayerContext';
import { formatCount } from '../utils/formatters';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Track       { id: string; title: string; genre?: string; audio_url: string; stream_count: number; }
interface Book        { id: string; title: string; price: number; }
interface Audiobook   { id: string; title: string; narrator: string; }
interface Performance { id: string; title: string; performer_name?: string; votes_count: number; }

// ── Flag map ───────────────────────────────────────────────────────────────────

const FLAG: Record<string, string> = {
  en: '🇬🇧', fr: '🇫🇷', es: '🇪🇸', ar: '🇸🇦',
  sw: '🇰🇪', de: '🇩🇪', no: '🇳🇴', sv: '🇸🇪',
  pt: '🇧🇷', ru: '🇷🇺', zh: '🇨🇳', yo: '🌍',
  ig: '🇳🇬', ha: '🇳🇬', pid: '🌍', bm: '🌍',
};

const GRADIENTS = [
  ['#9D4EDD', '#00D9FF'], ['#FF6B00', '#FFB800'],
  ['#00F5A0', '#00D9FF'], ['#FFB800', '#9D4EDD'],
];

const NAVY   = '#0A1128';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';

// ── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 && <Text style={styles.sectionCount}>{count} items</Text>}
    </View>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No {label} yet in this language</Text>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  route: { params: { language: string; languageName: string } };
}

export default function LanguageScreen({ route }: Props) {
  const { language, languageName } = route.params;
  const { play } = useGlobalPlayer();

  const [tracks,       setTracks]       = useState<Track[]>([]);
  const [books,        setBooks]        = useState<Book[]>([]);
  const [audiobooks,   setAudiobooks]   = useState<Audiobook[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('tracks').select('id,title,genre,audio_url,stream_count').eq('language', language).limit(8),
      supabase.from('ecom_products').select('id,title,price').eq('language', language).eq('product_type', 'Book').limit(6),
      supabase.from('audiobooks').select('id,title,narrator').eq('language', language).limit(4),
      supabase.from('competition_entries_v2').select('id,title,performer_name,votes_count').eq('language', language).in('status', ['live', 'winner']).limit(4),
    ]).then(([tr, bk, ab, pf]) => {
      setTracks((tr.data ?? []) as Track[]);
      setBooks((bk.data ?? []) as Book[]);
      setAudiobooks((ab.data ?? []) as Audiobook[]);
      setPerformances((pf.data ?? []) as Performance[]);
      setLoading(false);
    });
  }, [language]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CYAN} />
      </View>
    );
  }

  const flag = FLAG[language] ?? '🌍';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.langName}>{languageName}</Text>
        <Text style={styles.langCode}>{language.toUpperCase()}</Text>
      </View>

      {/* Music */}
      <SectionHeader title="🎵 Music" count={tracks.length} />
      {tracks.length === 0 ? <EmptyState label="tracks" /> : (
        <FlatList
          horizontal
          data={tracks}
          keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item, index }) => {
            const [c1, c2] = GRADIENTS[index % GRADIENTS.length];
            return (
              <TouchableOpacity
                style={styles.trackCard}
                onPress={() => play({ id: item.id, title: item.title, artist: item.genre ?? 'Unknown', audioUrl: item.audio_url })}
              >
                <View style={[styles.trackArt, { backgroundColor: c1 }]}>
                  <Text style={styles.trackArtIcon}>🎵</Text>
                </View>
                <Text style={styles.trackTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.trackMeta}>{formatCount(item.stream_count)} streams</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Books */}
      <SectionHeader title="📚 Books" count={books.length} />
      {books.length === 0 ? <EmptyState label="books" /> : (
        <FlatList
          horizontal
          data={books}
          keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item, index }) => {
            const [c1] = GRADIENTS[index % GRADIENTS.length];
            return (
              <View style={styles.bookCard}>
                <View style={[styles.bookCover, { backgroundColor: c1 }]}>
                  <Text style={{ fontSize: 28 }}>📚</Text>
                </View>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.bookPrice, { color: item.price === 0 ? GREEN : GOLD }]}>
                  {item.price === 0 ? 'FREE' : `$${item.price.toFixed(2)}`}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* Audiobooks */}
      <SectionHeader title="🎧 Audiobooks" count={audiobooks.length} />
      {audiobooks.length === 0 ? <EmptyState label="audiobooks" /> : (
        <FlatList
          horizontal
          data={audiobooks}
          keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item, index }) => {
            const [c1] = GRADIENTS[index % GRADIENTS.length];
            return (
              <View style={styles.bookCard}>
                <View style={[styles.bookCover, { backgroundColor: c1 }]}>
                  <Text style={{ fontSize: 28 }}>🎧</Text>
                </View>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.trackMeta}>{item.narrator}</Text>
              </View>
            );
          }}
        />
      )}

      {/* Performances */}
      <SectionHeader title="🎭 Performances" count={performances.length} />
      {performances.length === 0 ? <EmptyState label="performances" /> : (
        <FlatList
          horizontal
          data={performances}
          keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item, index }) => {
            const [c1, c2] = GRADIENTS[index % GRADIENTS.length];
            return (
              <View style={styles.perfCard}>
                <View style={[styles.perfThumb, { backgroundColor: c1 }]}>
                  <Text style={{ fontSize: 32 }}>🎤</Text>
                </View>
                <Text style={styles.trackTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.trackMeta}>{item.performer_name}</Text>
                <View style={styles.votesBadge}>
                  <Text style={styles.votesText}>❤ {formatCount(item.votes_count)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: NAVY },
  content:       { paddingBottom: 100 },
  center:        { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  header:        { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  flag:          { fontSize: 48, marginBottom: 8 },
  langName:      { color: '#fff', fontSize: 26, fontWeight: '800' },
  langCode:      { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10, marginTop: 20 },
  sectionTitle:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionCount:  { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  hList:         { paddingHorizontal: 16, gap: 10 },
  empty:         { marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText:     { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  trackCard:     { width: 100, marginRight: 0 },
  trackArt:      { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  trackArtIcon:  { fontSize: 28 },
  trackTitle:    { color: '#fff', fontSize: 11, fontWeight: '600', lineHeight: 15 },
  trackMeta:     { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
  bookCard:      { width: 110, marginRight: 0 },
  bookCover:     { width: 90, height: 120, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  bookTitle:     { color: '#fff', fontSize: 11, fontWeight: '600', lineHeight: 15 },
  bookPrice:     { fontSize: 11, fontWeight: '700', marginTop: 4 },
  perfCard:      { width: 130, marginRight: 0 },
  perfThumb:     { width: 120, height: 70, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  votesBadge:    { backgroundColor: ORANGE + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  votesText:     { color: ORANGE, fontSize: 11, fontWeight: '700' },
});
