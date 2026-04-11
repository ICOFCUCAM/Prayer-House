import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number;
}

export interface GlobalPlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
}

export const GlobalPlayerContext = createContext<GlobalPlayerContextValue>({
  currentTrack: null,
  isPlaying: false,
  queue: [],
  play: () => {},
  pause: () => {},
  resume: () => {},
  next: () => {},
  prev: () => {},
  addToQueue: () => {},
  clearQueue: () => {},
});

const SESSION_KEY = 'wankong_player_queue';

function loadQueueFromSession(): Track[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Track[];
  } catch {
    return [];
  }
}

function saveQueueToSession(queue: Track[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage errors
  }
}

export function GlobalPlayerProvider({ children }: { children: ReactNode }) {
  // Single HTMLAudioElement ref — never recreated on render
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>(loadQueueFromSession);

  // Initialise singleton audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }

    const audio = audioRef.current;

    const handleEnded = () => {
      setQueue(prev => {
        if (prev.length === 0) {
          setIsPlaying(false);
          setCurrentTrack(null);
          return prev;
        }
        const [next, ...rest] = prev;
        setCurrentTrack(next);
        audio.src = next.audioUrl;
        audio.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
        saveQueueToSession(rest);
        return rest;
      });
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const play = useCallback(
    (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return;

      // If same track: toggle play/pause
      if (currentTrack?.id === track.id) {
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(() => setIsPlaying(false));
        }
        return;
      }

      audio.src = track.audioUrl;
      audio.load();
      setCurrentTrack(track);
      audio.play().catch(() => setIsPlaying(false));
    },
    [currentTrack, isPlaying]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => setIsPlaying(false));
  }, []);

  const next = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setQueue(prev => {
      if (prev.length === 0) {
        audio.pause();
        setIsPlaying(false);
        return prev;
      }
      const [nextTrack, ...rest] = prev;
      setCurrentTrack(nextTrack);
      audio.src = nextTrack.audioUrl;
      audio.play().catch(() => setIsPlaying(false));
      saveQueueToSession(rest);
      return rest;
    });
  }, []);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Restart current if past 3 s; otherwise just rewind
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.currentTime = 0;
    }
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => {
      const updated = [...prev, track];
      saveQueueToSession(updated);
      return updated;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    saveQueueToSession([]);
  }, []);

  // Keep sessionStorage in sync whenever queue changes
  useEffect(() => {
    saveQueueToSession(queue);
  }, [queue]);

  const value: GlobalPlayerContextValue = {
    currentTrack,
    isPlaying,
    queue,
    play,
    pause,
    resume,
    next,
    prev,
    addToQueue,
    clearQueue,
  };

  return (
    <GlobalPlayerContext.Provider value={value}>
      {children}
    </GlobalPlayerContext.Provider>
  );
}

export function useGlobalPlayer(): GlobalPlayerContextValue {
  return useContext(GlobalPlayerContext);
}
