import { Play } from 'lucide-react';

interface Props {
  gradient?: string;
  label?:    string;
}

/**
 * Fills its parent (position:relative, overflow:hidden) with a dark gradient
 * + grid texture + centered play icon + bottom label.
 * Used whenever a performance has no video thumbnail.
 */
export default function DefaultPerformanceThumbnail({ gradient, label }: Props) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-end justify-end
                  bg-gradient-to-br ${gradient ?? 'from-[#0D1635] to-[#090F24]'}`}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Diagonal shimmer stripe */}
      <div className="absolute inset-0 opacity-[0.04] bg-gradient-to-br from-white/0 via-white to-white/0" />

      {/* Center play icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm border border-white/25
                     flex items-center justify-center shadow-xl"
        >
          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Bottom title label */}
      <div className="relative w-full px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-white/60 text-[10px] font-medium truncate">
          {label ?? 'Performance Preview'}
        </p>
      </div>
    </div>
  );
}
