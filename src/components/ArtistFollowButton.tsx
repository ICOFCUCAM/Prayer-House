import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserCheck, UserPlus, Loader2 } from 'lucide-react';

interface ArtistFollowButtonProps {
  artistId: string;
  userId?: string;
}

const ArtistFollowButton: React.FC<ArtistFollowButtonProps> = ({ artistId, userId }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;

    const fetchFollowState = async () => {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from('artist_followers')
        .select('id')
        .eq('artist_id', artistId)
        .eq('follower_id', userId)
        .maybeSingle();

      if (!cancelled) {
        if (!error) {
          setIsFollowing(data !== null);
        }
        setInitialLoading(false);
      }
    };

    fetchFollowState();
    return () => { cancelled = true; };
  }, [artistId, userId]);

  const handleToggle = useCallback(async () => {
    if (!userId || loading) return;

    // Optimistic UI
    const prev = isFollowing;
    setIsFollowing(!prev);
    setLoading(true);

    try {
      if (prev) {
        // Unfollow
        const { error } = await supabase
          .from('artist_followers')
          .delete()
          .eq('artist_id', artistId)
          .eq('follower_id', userId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('artist_followers')
          .insert({ artist_id: artistId, follower_id: userId });

        if (error) throw error;
      }
    } catch {
      // Revert on error
      setIsFollowing(prev);
    } finally {
      setLoading(false);
    }
  }, [artistId, userId, isFollowing, loading]);

  // Disabled state when no user
  if (!userId) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#00D9FF] text-[#00D9FF] text-sm font-semibold opacity-40 cursor-not-allowed select-none"
      >
        <UserPlus className="w-4 h-4" />
        Follow
      </button>
    );
  }

  if (initialLoading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 text-gray-500 text-sm font-semibold cursor-not-allowed select-none"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 select-none',
        isFollowing
          ? 'bg-[#00F5A0]/10 border border-[#00F5A0] text-[#00F5A0] hover:bg-red-500/10 hover:border-red-500 hover:text-red-400'
          : 'bg-transparent border border-[#00D9FF] text-[#00D9FF] hover:bg-[#00D9FF]/10',
        loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
      aria-label={isFollowing ? 'Unfollow artist' : 'Follow artist'}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {loading ? 'Saving...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};

export default ArtistFollowButton;
