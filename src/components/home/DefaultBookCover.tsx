import { BookOpen } from 'lucide-react';

interface Props {
  title:  string;
  author: string;
}

/**
 * Renders a professional dark-gradient book cover when no product image exists.
 * Use as a drop-in replacement inside a relative-positioned, overflow-hidden container.
 */
export default function DefaultBookCover({ title, author }: Props) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 py-4"
      style={{ background: 'linear-gradient(135deg, #0D1635 0%, #090F24 100%)' }}
    >
      {/* Spine shimmer */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white/15 rounded-l-xl" />

      {/* Watermark book icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <BookOpen className="w-24 h-24 text-white opacity-[0.04]" strokeWidth={1} />
      </div>

      {/* Subtle top accent */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Text content */}
      <div className="relative z-10 w-full">
        <BookOpen className="w-5 h-5 text-white/20 mx-auto mb-2.5" strokeWidth={1.5} />
        <p className="text-white font-bold text-[11px] leading-tight line-clamp-4 drop-shadow">
          {title}
        </p>
        <div className="w-8 h-px bg-white/15 mx-auto my-2" />
        <p className="text-white/40 text-[9px] truncate">{author}</p>
      </div>
    </div>
  );
}
