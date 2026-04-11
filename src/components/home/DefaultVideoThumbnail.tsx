import { Play } from 'lucide-react';

interface Props {
  title?:    string;
  gradient?: string; // optional tint, e.g. 'from-[#9D4EDD]/30 to-[#00D9FF]/20'
}

/**
 * Fallback thumbnail for performances with no video thumbnail URL.
 * Fills its parent container (use inside a relative, overflow-hidden wrapper).
 */
export default function DefaultVideoThumbnail({ title, gradient }: Props) {
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
            'linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Centered play icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/25
                        flex items-center justify-center shadow-xl">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Bottom label */}
      <div className="relative w-full px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-white/60 text-[10px] font-medium truncate">
          {title ?? 'Performance Preview'}
        </p>
      </div>
    </div>
  );
}
