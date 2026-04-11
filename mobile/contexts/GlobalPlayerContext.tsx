import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

export interface Track {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number;
}

interface GlobalPlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  queue: Track[];
  play: (track: Track) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  addToQueue: (track: Track) => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
}

const GlobalPlayerContext = createContext<GlobalPlayerContextValue>({
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  queue: [],
  play: async () => {},
  pause: async () => {},
  resume: async () => {},
  addToQueue: () => {},
  next: async () => {},
  prev: async () => {},
});

export function GlobalPlayerProvider({ children }: { children: ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const historyRef = useRef<Track[]>([]);

  // Configure audio mode once
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const unloadCurrent = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis / 1000);
    setDuration((status.durationMillis ?? 0) / 1000);
    setIsPlaying(status.isPlaying);

    // Auto-advance when done
    if (status.didJustFinish) {
      setQueue(prev => {
        if (prev.length > 1) {
          const next = prev.slice(1);
          setQueueIndex(0);
          return next;
        }
        return prev;
      });
    }
  }, []);

  const play = useCallback(
    async (track: Track) => {
      await unloadCurrent();

      if (currentTrack) {
        historyRef.current = [currentTrack, ...historyRef.current].slice(0, 20);
      }

      setCurrentTrack(track);
      setIsPlaying(false);
      setPosition(0);

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: track.audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
      } catch (err) {
        console.warn('Error loading audio:', err);
      }
    },
    [currentTrack, unloadCurrent, onPlaybackStatusUpdate]
  );

  const pause = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } catch {
        // ignore
      }
    }
  }, []);

  const resume = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } catch {
        // ignore
      }
    }
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => {
      const exists = prev.some(t => t.id === track.id);
      if (exists) return prev;
      return [...prev, track];
    });
  }, []);

  const next = useCallback(async () => {
    setQueue(prev => {
      if (prev.length > 1) {
        const [, ...rest] = prev;
        const nextTrack = rest[0];
        if (nextTrack) {
          play(nextTrack);
        }
        return rest;
      }
      return prev;
    });
  }, [play]);

  const prev = useCallback(async () => {
    const history = historyRef.current;
    if (history.length > 0) {
      const [prevTrack, ...restHistory] = history;
      historyRef.current = restHistory;
      await play(prevTrack);
    }
  }, [play]);

  // When queue changes externally, auto-play the first if nothing playing
  useEffect(() => {
    if (queue.length > 0 && !currentTrack) {
      play(queue[0]);
    }
  }, [queue, currentTrack, play]);

  return (
    <GlobalPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        position,
        duration,
        queue,
        play,
        pause,
        resume,
        addToQueue,
        next,
        prev,
      }}
    >
      {children}
    </GlobalPlayerContext.Provider>
  );
}

export function useGlobalPlayer(): GlobalPlayerContextValue {
  return useContext(GlobalPlayerContext);
}
