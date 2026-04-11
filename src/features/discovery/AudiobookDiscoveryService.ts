import { supabase } from '@/lib/supabase';

// ── AudiobookDiscoveryService ─────────────────────────────────
// Surfaces audiobooks for discovery: featured, by language, search.

export interface DiscoveredAudiobook {
  id: string;
  title: string;
  narrator: string | null;
  language: string;
  cover_url: string | null;
  audio_price: number | null;
  ebook_price: number | null;
  bundle_price: number | null;
  description: string | null;
  created_at: string;
  author_id: string | null;
}

export async function getFeaturedAudiobooks(limit = 10): Promise<DiscoveredAudiobook[]> {
  const { data, error } = await supabase
    .from('audiobooks')
    .select(
      'id, title, narrator, language, cover_url, audio_price, ebook_price, bundle_price, description, created_at, author_id',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getFeaturedAudiobooks error:', error);
    return [];
  }

  return (data ?? []) as DiscoveredAudiobook[];
}

export async function getAudiobooksByLanguage(
  language: string,
  limit = 20,
): Promise<DiscoveredAudiobook[]> {
  const { data, error } = await supabase
    .from('audiobooks')
    .select(
      'id, title, narrator, language, cover_url, audio_price, ebook_price, bundle_price, description, created_at, author_id',
    )
    .ilike('language', language.trim())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getAudiobooksByLanguage error:', error);
    return [];
  }

  return (data ?? []) as DiscoveredAudiobook[];
}

export async function searchAudiobooks(
  query: string,
  limit = 20,
): Promise<DiscoveredAudiobook[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('audiobooks')
    .select(
      'id, title, narrator, language, cover_url, audio_price, ebook_price, bundle_price, description, created_at, author_id',
    )
    .ilike('title', `%${query.trim()}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('searchAudiobooks error:', error);
    return [];
  }

  return (data ?? []) as DiscoveredAudiobook[];
}
