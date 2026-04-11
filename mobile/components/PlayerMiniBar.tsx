import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useGlobalPlayer } from '../contexts/GlobalPlayerContext';

const COVER_COLOURS = [
  ['#9D4EDD', '#00D9FF'],
  ['#FF6B00', '#FFB800'],
  ['#00F5A0', '#00D9FF'],
  ['#9D4EDD', '#FF6B00'],
];

function getColours(id: string): [string, string] {
  const hash = id
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COVER_COLOURS[hash % COVER_COLOURS.length];
}

export default function PlayerMiniBar() {
  const { currentTrack, isPlaying, position, duration, pause, resume, next } =
    useGlobalPlayer();

  const colours = useMemo(
    () => (currentTrack ? getColours(currentTrack.id) : ['#9D4EDD', '#00D9FF'] as [string, string]),
    [currentTrack]
  );

  const progress = duration > 0 ? position / duration : 0;

  if (!currentTrack) return null;

  const displayTitle =
    currentTrack.title.length > 28
      ? currentTrack.title.slice(0, 28) + '…'
      : currentTrack.title;

  const displayArtist =
    currentTrack.artist.length > 22
      ? currentTrack.artist.slice(0, 22) + '…'
      : currentTrack.artist;

  return (
    <View style={styles.container}>
      {/* Progress bar at top */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={styles.inner}>
        {/* Cover art */}
        <View
          style={[
            styles.cover,
            { backgroundColor: colours[0] },
          ]}
        >
          <Text style={styles.coverText}>
            {currentTrack.title.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Track info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {displayArtist}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={isPlaying ? pause : resume}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.controlText}>{isPlaying ? '⏸' : '▶️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={next}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.controlText}>⏭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // above tab bar
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#1A2240',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 217, 255, 0.2)',
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#00D9FF',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  coverText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    padding: 8,
  },
  controlText: {
    fontSize: 22,
  },
});
