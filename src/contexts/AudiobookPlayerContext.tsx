import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';

export interface AudioChapter {
  id: string;
  audiobookId: string;
  chapterNum: number;
  title: string;
  audioUrl: string;
  duration_s: number;
}

export interface AudiobookPlayerContextValue {
  currentAudiobook: string | null;
  currentChapter: AudioChapter | null;
  chapters: AudioChapter[];
  isPlaying: boolean;
  progress: number; // 0–100
  play: (audiobookId: string, chapter: AudioChapter, allChapters: AudioChapter[]) => void;
  pause: () => void;
  resume: () => void;
  nextChapter: () => void;
  prevChapter: () => void;
  seek: (pct: number) => void;
}

const AudiobookPlayerContext = createContext<AudiobookPlayerContextValue>({
  currentAudiobook: null,
  currentChapter: null,
  chapters: [],
  isPlaying: false,
  progress: 0,
  play: () => {},
  pause: () => {},
  resume: () => {},
  nextChapter: () => {},
  prevChapter: () => {},
  seek: () => {},
});

// ── Persistence helpers ───────────────────────────────────────────────────────

function progressKey(audiobookId: string): string {
  return `audiobook_progress_${audiobookId}`;
}

interface ProgressData {
  chapterId: string;
  timeSec: number;
}

function saveProgress(audiobookId: string, chapterId: string, timeSec: number): void {
  try {
    const data: ProgressData = { chapterId, timeSec };
    localStorage.setItem(progressKey(audiobookId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadProgress(audiobookId: string): ProgressData | null {
  try {
    const raw = localStorage.getItem(progressKey(audiobookId));
    if (!raw) return null;
    return JSON.parse(raw) as ProgressData;
  } catch {
    return null;
  }
}

const SAVE_INTERVAL_MS = 5000;

// ── Provider ──────────────────────────────────────────────────────────────────

export function AudiobookPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [currentAudiobook, setCurrentAudiobook] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState<AudioChapter | null>(null);
  const [chapters, setChapters] = useState<AudioChapter[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Ref mirrors for stable event callbacks
  const currentAudiobookRef = useRef<string | null>(null);
  const currentChapterRef = useRef<AudioChapter | null>(null);
  const chaptersRef = useRef<AudioChapter[]>([]);

  useEffect(() => { currentAudiobookRef.current = currentAudiobook; }, [currentAudiobook]);
  useEffect(() => { currentChapterRef.current = currentChapter; }, [currentChapter]);
  useEffect(() => { chaptersRef.current = chapters; }, [chapters]);

  // Initialise singleton audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    // Auto-advance to next chapter on 'ended' event
    const handleEnded = () => {
      const current = currentChapterRef.current;
      const bookId = currentAudiobookRef.current;
      const allChapters = chaptersRef.current;
      if (!current || !bookId) { setIsPlaying(false); return; }

      const idx = allChapters.findIndex(c => c.id === current.id);
      if (idx >= 0 && idx < allChapters.length - 1) {
        loadAndPlay(audio, bookId, allChapters[idx + 1]);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic save
  useEffect(() => {
    if (isPlaying && currentAudiobook && currentChapter) {
      saveIntervalRef.current = setInterval(() => {
        const audio = audioRef.current;
        if (audio && currentAudiobookRef.current && currentChapterRef.current) {
          saveProgress(currentAudiobookRef.current, currentChapterRef.current.id, audio.currentTime);
        }
      }, SAVE_INTERVAL_MS);
    } else {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    }
    return () => {
      if (saveIntervalRef.current) { clearInterval(saveIntervalRef.current); }
    };
  }, [isPlaying, currentAudiobook, currentChapter]);

  function loadAndPlay(audio: HTMLAudioElement, audiobookId: string, chapter: AudioChapter) {
    // Save position of current chapter before switching
    const prevBookId = currentAudiobookRef.current;
    const prevChapter = currentChapterRef.current;
    if (prevBookId && prevChapter && audio.currentTime > 0) {
      saveProgress(prevBookId, prevChapter.id, audio.currentTime);
    }

    audio.src = chapter.audioUrl;
    audio.load();

    // Restore saved position within this audiobook
    const saved = loadProgress(audiobookId);
    audio.addEventListener(
      'loadedmetadata',
      () => {
        if (saved?.chapterId === chapter.id && saved.timeSec > 0 && saved.timeSec < (audio.duration || Infinity)) {
          audio.currentTime = saved.timeSec;
        }
        audio.play().catch(() => setIsPlaying(false));
      },
      { once: true }
    );

    setCurrentAudiobook(audiobookId);
    setCurrentChapter(chapter);
    setProgress(0);
  }

  const play = useCallback(
    (audiobookId: string, chapter: AudioChapter, allChapters: AudioChapter[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      setChapters(allChapters);

      // Same chapter — toggle
      if (
        currentChapterRef.current?.id === chapter.id &&
        currentAudiobookRef.current === audiobookId
      ) {
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(() => setIsPlaying(false));
        }
        return;
      }

      loadAndPlay(audio, audiobookId, chapter);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPlaying]
  );

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    if (currentAudiobookRef.current && currentChapterRef.current) {
      saveProgress(currentAudiobookRef.current, currentChapterRef.current.id, audio.currentTime);
    }
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => setIsPlaying(false));
  }, []);

  const nextChapter = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const current = currentChapterRef.current;
    const bookId = currentAudiobookRef.current;
    const allChapters = chaptersRef.current;
    if (!current || !bookId) return;

    const idx = allChapters.findIndex(c => c.id === current.id);
    if (idx >= 0 && idx < allChapters.length - 1) {
      loadAndPlay(audio, bookId, allChapters[idx + 1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevChapter = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const current = currentChapterRef.current;
    const bookId = currentAudiobookRef.current;
    const allChapters = chaptersRef.current;
    if (!current || !bookId) return;

    if (audio.currentTime > 5) {
      audio.currentTime = 0;
      return;
    }

    const idx = allChapters.findIndex(c => c.id === current.id);
    if (idx > 0) {
      loadAndPlay(audio, bookId, allChapters[idx - 1]);
    } else {
      audio.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    audio.currentTime = (pct / 100) * audio.duration;
    setProgress(pct);
  }, []);

  const value: AudiobookPlayerContextValue = {
    currentAudiobook,
    currentChapter,
    chapters,
    isPlaying,
    progress,
    play,
    pause,
    resume,
    nextChapter,
    prevChapter,
    seek,
  };

  return (
    <AudiobookPlayerContext.Provider value={value}>
      {children}
    </AudiobookPlayerContext.Provider>
  );
}

export function useAudiobookPlayer(): AudiobookPlayerContextValue {
  return useContext(AudiobookPlayerContext);
}
