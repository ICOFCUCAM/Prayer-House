import { supabase } from '@/lib/supabase';

// ── FeaturedArtistsService ────────────────────────────────────
// Fetches and searches artist profiles from the platform.

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  banner_url: string | null;
  verified: boolean;
  streams: number;
  followers: number;
  genre: string | null;
  country: string | null;
  user_id: string | null;
}

export async function getFeaturedArtists(limit = 8): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('id, name, slug, bio, photo_url, banner_url, verified, streams, followers, genre, country, user_id')
    .eq('verified', true)
    .order('streams', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getFeaturedArtists error:', error);
    return [];
  }

  return (data ?? []) as Artist[];
}

export async function searchArtists(query: string, limit = 20): Promise<Artist[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('artists')
    .select('id, name, slug, bio, photo_url, banner_url, verified, streams, followers, genre, country, user_id')
    .ilike('name', `%${query.trim()}%`)
    .order('streams', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('searchArtists error:', error);
    return [];
  }

  return (data ?? []) as Artist[];
}

export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select('id, name, slug, bio, photo_url, banner_url, verified, streams, followers, genre, country, user_id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('getArtistBySlug error:', error);
    return null;
  }

  return data as Artist | null;
}

export async function followArtist(artistId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('artist_followers')
    .upsert({ artist_id: artistId, user_id: userId }, { onConflict: 'artist_id,user_id' });

  if (error) {
    console.error('followArtist error:', error);
    throw new Error(error.message);
  }
}

export async function unfollowArtist(artistId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('artist_followers')
    .delete()
    .eq('artist_id', artistId)
    .eq('user_id', userId);

  if (error) {
    console.error('unfollowArtist error:', error);
    throw new Error(error.message);
  }
}

export async function isFollowingArtist(artistId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('artist_followers')
    .select('user_id')
    .eq('artist_id', artistId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}
