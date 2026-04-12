import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Music, BookOpen, Headphones, Mic2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/components/GlobalPlayer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeedItem {
  id:          string;
  creator_id:  string;
  creator_name: string;
  creator_avatar?: string;
  action:      'released' | 'uploaded' | 'joined_competition';
  content_title?: string;
  content_type?:  'music' | 'audiobook' | 'book' | 'podcast';
  content_url?:   string;
  cover_url?:     string;
  audio_url?:     string;
  created_at:  string;
}

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  music:     <Music      className="w-3.5 h-3.5" />,
  audiobook: <Headphones className="w-3.5 h-3.5" />,
  book:      <BookOpen   className="w-3.5 h-3.5" />,
  podcast:   <Mic2       className="w-3.5 h-3.5" />,
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function FollowFeed({ limit = 12 }: { limit?: number }) {
  const { user }  = useAuth();
  const { play }  = usePlayer();
  const [items,   setItems]   = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // 1. Get followed creator IDs
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const ids = (follows || []).map((f: any) => f.following_id);

      if (!ids.length) { setItems([]); setLoading(false); return; }

      // 2. Fetch recent activity from ecom_products for followed creators
      const { data: products } = await supabase
        .from('ecom_products')
        .select('id, title, product_type, cover_image_url, audio_url, created_at, creator_id, profiles:creator_id(full_name, avatar_url)')
        .in('creator_id', ids)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      const mapped: FeedItem[] = (products || []).map((p: any) => ({
        id:             p.id,
        creator_id:     p.creator_id,
        creator_name:   p.profiles?.full_name || 'Unknown Artist',
        creator_avatar: p.profiles?.avatar_url,
        action:         'released',
        content_title:  p.title,
        content_type:   p.product_type as FeedItem['content_type'],
        cover_url:      p.cover_image_url,
        audio_url:      p.audio_url,
        created_at:     p.created_at,
      }));

      setItems(mapped);
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [user, limit]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-white/10 rounded w-2/3" />
              <div className="h-2.5 bg-white/5 rounded w-1/2" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/10 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-center py-10 text-white/30">
        <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Follow artists to see their latest releases here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-base">Following Feed</h3>
        <button onClick={fetchFeed} className="text-white/30 hover:text-white transition-colors p-1">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 group">
            {/* Avatar */}
            <Link to={`/artists/${item.creator_id}`} className="shrink-0">
              {item.creator_avatar
                ? <img src={item.creator_avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center text-white font-bold text-sm">
                    {item.creator_name[0]}
                  </div>}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm leading-snug">
                <Link to={`/artists/${item.creator_id}`} className="font-semibold hover:text-[#00D9FF] transition-colors">
                  {item.creator_name}
                </Link>
                {' '}
                <span className="text-white/50">
                  {item.action === 'released' ? 'released' : item.action === 'joined_competition' ? 'entered a competition' : 'uploaded'}
                </span>
                {item.content_title && (
                  <> <span className="text-white/80 font-medium">"{item.content_title}"</span></>
                )}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {item.content_type && (
                  <span className="text-white/30">{TYPE_ICON[item.content_type]}</span>
                )}
                <span className="text-white/30 text-[10px]">{relTime(item.created_at)}</span>
              </div>
            </div>

            {/* Thumbnail / play */}
            {item.cover_url && (
              <button
                onClick={() => item.audio_url && play({
                  id:       item.id,
                  title:    item.content_title || 'Untitled',
                  artist:   item.creator_name,
                  albumArt: item.cover_url,
                  audioUrl: item.audio_url,
                })}
                className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative group/thumb"
              >
                <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                {item.audio_url && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-4 h-4 text-white fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
