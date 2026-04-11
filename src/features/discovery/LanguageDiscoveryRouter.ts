import { supabase } from '@/lib/supabase';

// ── LanguageDiscoveryRouter ───────────────────────────────────
// Aggregates cross-content discovery scoped by language / locale.

export interface LanguageContent {
  tracks: any[];
  books: any[];
  audiobooks: any[];
  performances: any[];
}

export interface LanguageSummary {
  code: string;
  name: string;
  contentCount: number;
}

// ISO-639-1 code → English name (common platform languages)
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
  ar: 'Arabic',
  sw: 'Swahili',
  ha: 'Hausa',
  yo: 'Yoruba',
  ig: 'Igbo',
  am: 'Amharic',
  zu: 'Zulu',
  xh: 'Xhosa',
  so: 'Somali',
  ko: 'Korean',
  hi: 'Hindi',
  zh: 'Chinese',
  de: 'German',
  it: 'Italian',
  ru: 'Russian',
  ja: 'Japanese',
};

function languageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

export async function getContentByLanguage(language: string): Promise<LanguageContent> {
  const lang = language.trim();

  const [tracksRes, booksRes, audiobooksRes, performancesRes] = await Promise.allSettled([
    supabase
      .from('tracks')
      .select('id, title, artist_name, cover_url, stream_count, genre, audio_url, language')
      .ilike('language', lang)
      .order('stream_count', { ascending: false })
      .limit(20),

    supabase
      .from('ecom_products')
      .select('id, title, author_name, cover_url, total_downloads, price, product_type, language')
      .eq('product_type', 'Book')
      .ilike('language', lang)
      .order('total_downloads', { ascending: false })
      .limit(20),

    supabase
      .from('audiobooks')
      .select('id, title, narrator, language, cover_url, audio_price, created_at')
      .ilike('language', lang)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('competition_entries_v2')
      .select('id, title, performer_name, thumbnail_url, votes_count, ai_score, status, room_id, language')
      .ilike('language', lang)
      .order('votes_count', { ascending: false })
      .limit(20),
  ]);

  const extract = (res: PromiseSettledResult<any>) =>
    res.status === 'fulfilled' && !res.value.error ? (res.value.data ?? []) : [];

  return {
    tracks: extract(tracksRes),
    books: extract(booksRes),
    audiobooks: extract(audiobooksRes),
    performances: extract(performancesRes),
  };
}

export function getLanguageRoute(languageCode: string): string {
  return `/music-store?lang=${encodeURIComponent(languageCode)}`;
}

export async function getPopularLanguages(limit = 10): Promise<LanguageSummary[]> {
  // Gather distinct languages across the three main content tables and count occurrences.
  const [tracksRes, audiobooksRes, booksRes] = await Promise.allSettled([
    supabase.from('tracks').select('language').not('language', 'is', null),
    supabase.from('audiobooks').select('language').not('language', 'is', null),
    supabase
      .from('ecom_products')
      .select('language')
      .eq('product_type', 'Book')
      .not('language', 'is', null),
  ]);

  const counts: Record<string, number> = {};

  const addRows = (res: PromiseSettledResult<any>) => {
    if (res.status === 'fulfilled' && !res.value.error) {
      for (const row of res.value.data ?? []) {
        const code = (row.language ?? '').toLowerCase().trim();
        if (code) counts[code] = (counts[code] ?? 0) + 1;
      }
    }
  };

  addRows(tracksRes);
  addRows(audiobooksRes);
  addRows(booksRes);

  return Object.entries(counts)
    .map(([code, contentCount]) => ({ code, name: languageName(code), contentCount }))
    .sort((a, b) => b.contentCount - a.contentCount)
    .slice(0, limit);
}
