import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';

export interface CompetitionEntry {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  performerName: string;
}

export interface CompetitionPlayerContextValue {
  currentEntry: CompetitionEntry | null;
  isPlaying: boolean;
  volume: number;
  playEntry: (entry: CompetitionEntry) => void;
  pause: () => void;
  resume: () => void;
  setVolume: (vol: number) => void;
}

export const CompetitionPlayerContext = createContext<CompetitionPlayerContextValue>({
  currentEntry: null,
  isPlaying: false,
  volume: 1,
  playEntry: () => {},
  pause: () => {},
  resume: () => {},
  setVolume: () => {},
});

export function CompetitionPlayerProvider({ children }: { children: ReactNode }) {
  // Single video element ref managed by the context
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [currentEntry, setCurrentEntry] = useState<CompetitionEntry | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(1);

  // Allow consumer components to register their <video> element
  // so the context can control it
  const registerVideo = useCallback(
    (entryId: string, el: HTMLVideoElement | null) => {
      if (el && currentEntry?.id === entryId) {
        videoRef.current = el;
        el.volume = volume;
        if (isPlaying) {
          el.play().catch(() => setIsPlaying(false));
        }
      } else if (!el && videoRef.current) {
        videoRef.current = null;
      }
    },
    [currentEntry, isPlaying, volume]
  );

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => setIsPlaying(false));
  }, []);

  // When playEntry called with new entry, stops previous
  const playEntry = useCallback(
    (entry: CompetitionEntry) => {
      const prev = videoRef.current;

      // Stop previous video
      if (prev && currentEntry?.id !== entry.id) {
        prev.pause();
        prev.currentTime = 0;
        videoRef.current = null;
      }

      setCurrentEntry(entry);
      setIsPlaying(true);
      // Actual playback begins once a consumer registers the video element
      // via registerVideo, or the consumer can call .play() directly after
      // checking currentEntry.id === entry.id
    },
    [currentEntry]
  );

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
    }
  }, []);

  const value: CompetitionPlayerContextValue = {
    currentEntry,
    isPlaying,
    volume,
    playEntry,
    pause,
    resume,
    setVolume,
  };

  return (
    <CompetitionPlayerContext.Provider value={value}>
      {children}
    </CompetitionPlayerContext.Provider>
  );
}

export function useCompetitionPlayer(): CompetitionPlayerContextValue {
  return useContext(CompetitionPlayerContext);
}
