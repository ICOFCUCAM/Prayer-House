import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  entryId: string;
  votes:   number;
  onVote?: (entryId: string) => void;
}

// Session-level dedup so a page refresh resets it (server validates properly)
const votedThisSession = new Set<string>();

/**
 * Auth-aware vote button.
 * - Unauthenticated users are redirected to /auth/login
 * - Authenticated users cast one vote per session; DB insert deduplicates
 */
export default function VoteButton({ entryId, votes, onVote }: Props) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const voted      = votedThisSession.has(entryId);

  const handleClick = async () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    if (voted) return;

    votedThisSession.add(entryId);
    onVote?.(entryId);

    try {
      await supabase.from('competition_votes').insert({
        entry_id:   entryId,
        user_id:    user.id,
        session_id: sessionStorage.getItem('vid') || Math.random().toString(36).slice(2),
      });
    } catch { /* server-side duplicate guard handles conflicts */ }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
        ${voted
          ? 'bg-[#FF6B00]/20 text-[#FF6B00] cursor-default'
          : 'bg-white/10 text-white hover:bg-[#FF6B00]/20 hover:text-[#FF6B00]'}`}
      aria-label={voted ? 'Already voted' : 'Vote for this performance'}
    >
      <Heart className={`w-3.5 h-3.5 ${voted ? 'fill-[#FF6B00]' : ''}`} />
      {votes.toLocaleString()} {voted ? '(voted)' : 'Vote'}
    </button>
  );
}
