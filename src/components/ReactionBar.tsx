import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  contentId:   string;
  contentType: string;
}

type Emoji = '❤️' | '🔥' | '🎵' | '🙏' | '👑';

const REACTIONS: Emoji[] = ['❤️', '🔥', '🎵', '🙏', '👑'];

interface ReactionCounts {
  [emoji: string]: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ReactionBar({ contentId, contentType }: Props) {
  const { user } = useAuth();

  const [counts,  setCounts]  = useState<ReactionCounts>({});
  const [myReacs, setMyReacs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set()); // debounce guard

  // ── Fetch counts + current user's reactions on mount / contentId change ──────

  useEffect(() => {
    if (!contentId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);

      // Aggregate counts for all users
      const { data: countData } = await supabase
        .from('content_reactions')
        .select('reaction')
        .eq('content_id', contentId);

      if (!cancelled) {
        const agg: ReactionCounts = {};
        for (const row of countData ?? []) {
          agg[row.reaction] = (agg[row.reaction] ?? 0) + 1;
        }
        setCounts(agg);
      }

      // Current user's own reactions
      if (user && !cancelled) {
        const { data: myData } = await supabase
          .from('content_reactions')
          .select('reaction')
          .eq('content_id', contentId)
          .eq('user_id', user.id);

        if (!cancelled) {
          setMyReacs(new Set((myData ?? []).map(r => r.reaction)));
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [contentId, user?.id]);

  // ── Toggle handler ────────────────────────────────────────────────────────────

  async function handleReaction(emoji: string) {
    if (!user)           return; // must be signed in
    if (pending.has(emoji)) return; // ignore rapid double-clicks

    const alreadyReacted = myReacs.has(emoji);

    // ── Optimistic UI update ──────────────────────────────────────────────────
    setPending(p => new Set(p).add(emoji));

    setCounts(prev => {
      const next = { ...prev };
      if (alreadyReacted) {
        next[emoji] = Math.max((next[emoji] ?? 1) - 1, 0);
      } else {
        next[emoji] = (next[emoji] ?? 0) + 1;
      }
      return next;
    });

    setMyReacs(prev => {
      const next = new Set(prev);
      if (alreadyReacted) next.delete(emoji);
      else next.add(emoji);
      return next;
    });

    // ── Persist to Supabase ───────────────────────────────────────────────────
    if (alreadyReacted) {
      const { error } = await supabase
        .from('content_reactions')
        .delete()
        .eq('content_id', contentId)
        .eq('user_id', user.id)
        .eq('reaction', emoji);

      if (error) {
        // Rollback optimistic update
        setCounts(prev => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
        setMyReacs(prev => new Set(prev).add(emoji));
      }
    } else {
      const { error } = await supabase
        .from('content_reactions')
        .upsert({
          user_id:      user.id,
          content_id:   contentId,
          content_type: contentType,
          reaction:     emoji,
          created_at:   new Date().toISOString(),
        }, { onConflict: 'user_id,content_id,reaction' });

      if (error) {
        // Rollback optimistic update
        setCounts(prev => ({ ...prev, [emoji]: Math.max((prev[emoji] ?? 1) - 1, 0) }));
        setMyReacs(prev => { const s = new Set(prev); s.delete(emoji); return s; });
      }
    }

    setPending(p => { const s = new Set(p); s.delete(emoji); return s; });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      role="group"
      aria-label="Reactions"
      className="flex flex-wrap items-center gap-2"
    >
      {REACTIONS.map(emoji => {
        const count    = counts[emoji] ?? 0;
        const active   = myReacs.has(emoji);
        const inFlight = pending.has(emoji);

        return (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            disabled={inFlight || loading}
            aria-pressed={active}
            aria-label={`React with ${emoji}${count > 0 ? `, ${count} reaction${count !== 1 ? 's' : ''}` : ''}`}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5
              rounded-full border text-sm font-medium
              transition-all duration-150
              disabled:cursor-not-allowed
              ${active
                ? 'border-[#00D9FF] bg-[#00D9FF]/10 text-white shadow-[0_0_8px_0_rgba(0,217,255,0.25)]'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white'
              }
              ${inFlight ? 'opacity-60 scale-95' : 'active:scale-95'}
              ${!user ? 'cursor-default opacity-50' : ''}
            `}
          >
            <span
              className={`text-base leading-none transition-transform duration-150 ${inFlight ? 'scale-110' : ''}`}
              aria-hidden="true"
            >
              {emoji}
            </span>
            {count > 0 && (
              <span
                className={`
                  tabular-nums text-xs leading-none
                  ${active ? 'text-[#00D9FF]' : 'text-white/50'}
                `}
              >
                {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
              </span>
            )}
          </button>
        );
      })}

      {/* Sign-in nudge when logged out */}
      {!user && !loading && (
        <span className="text-white/25 text-xs ml-1 select-none">
          Sign in to react
        </span>
      )}
    </div>
  );
}
