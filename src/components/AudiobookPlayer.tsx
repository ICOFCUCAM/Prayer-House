import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PlayCircle, PauseCircle } from 'lucide-react';

interface AudiobookPlayerProps {
  src: string;
  title: string;
  chapterNum?: number;
  onEnded?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const AudiobookPlayer: React.FC<AudiobookPlayerProps> = ({ src, title, chapterNum, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
    setIsLoading(true);
    audio.load();
  }, [src]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    setIsLoading(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    onEnded?.();
  }, [onEnded]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded, handleCanPlay]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const pct = Number(e.target.value);
    const newTime = (pct / 100) * audio.duration;
    audio.currentTime = newTime;
    setProgress(pct);
    setCurrentTime(newTime);
  }, []);

  return (
    <div className="bg-[#1A2240] rounded-xl p-4 flex flex-col gap-3 w-full select-none">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header */}
      <div className="flex flex-col gap-0.5">
        {chapterNum !== undefined && (
          <span className="text-xs text-[#00D9FF] font-semibold uppercase tracking-wider">
            Chapter {chapterNum}
          </span>
        )}
        <h3 className="text-white font-semibold text-sm truncate">{title}</h3>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="text-[#00D9FF] hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <PauseCircle className="w-10 h-10" />
          ) : (
            <PlayCircle className="w-10 h-10" />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          {/* Progress slider */}
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={handleSeek}
            disabled={isLoading || duration === 0}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #00D9FF ${progress}%, #2d3a5a ${progress}%)`,
            }}
          />
          {/* Time display */}
          <div className="flex justify-between text-[11px] text-gray-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{isLoading ? '--:--' : formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudiobookPlayer;
