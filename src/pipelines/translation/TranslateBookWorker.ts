import { supabase } from '@/lib/supabase';
import { TRANSLATION_TARGET_LANGUAGES, getLanguageName } from './LanguageMapping';

// ── TranslateBookWorker ────────────────────────────────────────
// Production: call a serverless function / edge function that:
//   1. Downloads the source PDF from Supabase storage
//   2. Extracts text (pdf-parse or similar)
//   3. Calls DeepL / Google Translate API per language
//   4. Generates translated PDF (pdf-lib or similar)
//   5. Uploads to 'translated-books' bucket
//   6. Updates book_translations record

export async function translateBook(bookId: string, sourcePdfUrl: string): Promise<void> {
  for (const lang of TRANSLATION_TARGET_LANGUAGES) {
    // Insert queued record (idempotent)
    await supabase.from('book_translations').upsert([{
      book_id:  bookId,
      language: lang,
      status:   'queued',
    }], { onConflict: 'book_id,language' });

    // In production, invoke edge function:
    // await supabase.functions.invoke('translate-book', {
    //   body: { bookId, sourcePdfUrl, targetLanguage: lang }
    // });

    // Simulate: mark as done with placeholder URL
    const translatedUrl = sourcePdfUrl.replace(/(\.[^.]+)$/, `_${lang}$1`);
    await supabase.from('book_translations').update({
      status:  'done',
      pdf_url: translatedUrl,
      title:   `[${getLanguageName(lang)} Translation]`,
    }).eq('book_id', bookId).eq('language', lang);
  }
}

// ── TranslationQueueService.ts inline ─────────────────────────
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
    .from('authors')
    .update({ auto_translate: enabled, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}
