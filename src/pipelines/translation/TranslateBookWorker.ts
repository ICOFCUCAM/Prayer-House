import { supabase } from '@/lib/supabase';
import { TRANSLATION_TARGET_LANGUAGES, getLanguageName } from './LanguageMapping';

// ── TranslateBookWorker ────────────────────────────────────────
// Invokes the deployed `translate-book` Supabase Edge Function.
// Falls back gracefully if the function is not yet deployed (dev mode).

export async function translateBook(
  bookId: string,
  sourcePdfUrl: string,
  authorId?: string,
): Promise<void> {
  // Queue all translation records as 'queued' first (idempotent)
  const queued = TRANSLATION_TARGET_LANGUAGES.map(lang => ({
    book_id:  bookId,
    language: lang,
    title:    `[${getLanguageName(lang)} Translation]`,
    status:   'queued' as const,
  }));

  await supabase.from('book_translations').upsert(queued, {
    onConflict: 'book_id,language',
    ignoreDuplicates: true,
  });

  // Invoke the Edge Function (asynchronous — fire and forget)
  const { error } = await supabase.functions.invoke('translate-book', {
    body: { book_id: bookId, author_id: authorId ?? null },
  });

  if (error) {
    // Edge Function not deployed or network error — log and continue.
    // Translation records stay 'queued' and will be processed when deployed.
    console.warn('[TranslateBookWorker] Edge function not reachable:', error.message);
  }
}

// ── TranslationQueueService ────────────────────────────────────

export async function getBookTranslations(bookId: string) {
  const { data } = await supabase
    .from('book_translations')
    .select('*')
    .eq('book_id', bookId)
    .order('language');
  return data ?? [];
}

export async function setAutoTranslate(userId: string, enabled: boolean): Promise<void> {
  await supabase
    .from('author_profiles')
    .update({ auto_translate: enabled, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}
