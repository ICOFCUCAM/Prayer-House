import { supabase } from '@/lib/supabase';

// ── TrendingEngine ────────────────────────────────────────────
// Surfaces trending content across all media types on the platform.

export interface TrendingTrack {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  stream_count: number;
  genre: string | null;
  audio_url: string | null;
}

export interface TrendingBook {
  id: string;
  title: string;
  author_name: string | null;
  cover_url: string | null;
  total_downloads: number;
  price: number | null;
  product_type: string;
}

export interface TrendingAudiobook {
  id: string;
  title: string;
  narrator: string | null;
  language: string;
  cover_url: string | null;
  audio_price: number | null;
  created_at: string;
}

export interface TrendingPerformance {
  id: string;
  title: string;
  performer_name: string;
  thumbnail_url: string | null;
  votes_count: number;
  ai_score: number | null;
  status: string;
  room_id: string;
}

export async function getTrendingTracks(limit = 10): Promise<TrendingTrack[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('id, title, artist_name, cover_url, stream_count, genre, audio_url')
    .order('stream_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getTrendingTracks error:', error);
    return [];
  }

  return (data ?? []) as TrendingTrack[];
}

export async function getTrendingBooks(limit = 10): Promise<TrendingBook[]> {
  const { data, error } = await supabase
    .from('ecom_products')
    .select('id, title, author_name, cover_url, total_downloads, price, product_type')
    .eq('product_type', 'Book')
    .order('total_downloads', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getTrendingBooks error:', error);
    return [];
  }

  return (data ?? []) as TrendingBook[];
}

export async function getTrendingAudiobooks(limit = 10): Promise<TrendingAudiobook[]> {
  const { data, error } = await supabase
    .from('audiobooks')
    .select('id, title, narrator, language, cover_url, audio_price, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getTrendingAudiobooks error:', error);
    return [];
  }

  return (data ?? []) as TrendingAudiobook[];
}

export async function getTrendingPerformances(limit = 10): Promise<TrendingPerformance[]> {
  const { data, error } = await supabase
    .from('competition_entries_v2')
    .select('id, title, performer_name, thumbnail_url, votes_count, ai_score, status, room_id')
    .in('status', ['winner', 'live'])
    .order('votes_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getTrendingPerformances error:', error);
    return [];
  }

  return (data ?? []) as TrendingPerformance[];
}
