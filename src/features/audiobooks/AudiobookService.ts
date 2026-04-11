import { supabase } from '@/lib/supabase';

export interface Audiobook {
  id: string;
  book_id: string;
  author_id: string;
  title: string;
  narrator: string;
  language: string;
  ebook_price: number;
  audio_price: number;
  bundle_price: number;
  cover_url?: string;
  description?: string;
  created_at: string;
}

export interface AudiobookChapter {
  id: string;
  audiobook_id: string;
  chapter_num: number;
  title: string;
  audio_url: string;
  duration_s: number;
}

export async function getAudiobook(id: string): Promise<Audiobook | null> {
  const { data, error } = await supabase
    .from('audiobooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('getAudiobook error:', error);
    return null;
  }
  return data as Audiobook;
}

export async function getAudiobookByBookId(bookId: string): Promise<Audiobook | null> {
  const { data, error } = await supabase
    .from('audiobooks')
    .select('*')
    .eq('book_id', bookId)
    .single();

  if (error) {
    console.error('getAudiobookByBookId error:', error);
    return null;
  }
  return data as Audiobook;
}

export async function listAudiobooks(language?: string, limit = 20): Promise<Audiobook[]> {
  let query = supabase
    .from('audiobooks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (language) {
    query = query.eq('language', language);
  }

  const { data, error } = await query;

  if (error) {
    console.error('listAudiobooks error:', error);
    return [];
  }
  return (data ?? []) as Audiobook[];
}

export async function createAudiobook(
  data: Omit<Audiobook, 'id' | 'created_at'>
): Promise<string> {
  const { data: inserted, error } = await supabase
    .from('audiobooks')
    .insert([data])
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return inserted.id as string;
}

export async function addChapter(
  data: Omit<AudiobookChapter, 'id'>
): Promise<string> {
  const { data: inserted, error } = await supabase
    .from('audiobook_chapters')
    .insert([data])
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return inserted.id as string;
}

export async function getChapters(audiobookId: string): Promise<AudiobookChapter[]> {
  const { data, error } = await supabase
    .from('audiobook_chapters')
    .select('*')
    .eq('audiobook_id', audiobookId)
    .order('chapter_num', { ascending: true });

  if (error) {
    console.error('getChapters error:', error);
    return [];
  }
  return (data ?? []) as AudiobookChapter[];
}
