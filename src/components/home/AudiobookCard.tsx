import { Play, Headphones, Clock } from 'lucide-react';

interface Props {
  title:    string;
  author:   string;
  lang:     string;
  hours:    string;
  gradient: string;
  onClick?: () => void;
}

/**
 * Audiobook discovery card.
 * Square thumbnail with waveform overlay, play button, and duration badge.
 */
export default function AudiobookCard({ title, author, lang, hours, gradient, onClick }: Props) {
  return (
    <div className="shrink-0 w-44 cursor-pointer group" onClick={onClick}>

      {/* Thumbnail */}
      <div
        className={`relative w-full aspect-square rounded-xl bg-gradient-to-br ${gradient} overflow-hidden mb-3
                    shadow-lg shadow-black/40 border border-white/10
                    group-hover:scale-[1.02] transition-transform duration-300`}
      >
        {/* Simulated book-cover texture stripes */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.15) 3px,rgba(255,255,255,0.15) 4px)' }}
        />

        {/* Headphones watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Headphones className="w-14 h-14 text-white opacity-20" strokeWidth={1} />
        </div>

        {/* Waveform bars — centered */}
        <div className="absolute inset-x-0 bottom-10 flex items-end justify-center gap-[3px] px-6">
          {[3, 7, 5, 9, 6, 11, 8, 10, 6, 7, 4, 8, 5].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-white/60"
              style={{ height: `${h * 2}px`, opacity: 0.4 + (i % 3) * 0.2 }}
            />
          ))}
        </div>

        {/* Play button — center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/30
                          flex items-center justify-center shadow-xl
                          group-hover:bg-white/30 transition-colors">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration badge — bottom right */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm
                        text-white/80 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          <Clock className="w-2.5 h-2.5" />
          {hours}
        </div>

        {/* Language badge — top left */}
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white/70
                        text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
          {lang}
        </div>
      </div>

      {/* Meta */}
      <p className="text-white text-sm font-semibold leading-tight line-clamp-2 group-hover:text-[#FF6B00] transition-colors">
        {title}
      </p>
      <p className="text-white/50 text-xs mt-1 truncate">{author}</p>
    </div>
  );
}
