import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── Supported languages ────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',    nativeLabel: 'English'    },
  { code: 'fr', label: 'French',     nativeLabel: 'Français'   },
  { code: 'no', label: 'Norwegian',  nativeLabel: 'Norsk'      },
  { code: 'sw', label: 'Swahili',    nativeLabel: 'Kiswahili'  },
  { code: 'de', label: 'German',     nativeLabel: 'Deutsch'    },
  { code: 'es', label: 'Spanish',    nativeLabel: 'Español'    },
  { code: 'ar', label: 'Arabic',     nativeLabel: 'العربية'    },
  { code: 'zh', label: 'Chinese',    nativeLabel: '中文'        },
] as const;

export type SupportedLang = typeof SUPPORTED_LANGUAGES[number]['code'];

export const SUPPORTED_LANG_CODES = SUPPORTED_LANGUAGES.map(l => l.code);

export const RTL_LANGUAGES: SupportedLang[] = ['ar'];

// ── Apply dir attribute when language changes ──────────────────────────────────

export function applyLangDir(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGUAGES.includes(lang as SupportedLang) ? 'rtl' : 'ltr';
}

// ── Dynamic loader — reads from /public/locales/<lang>.json ───────────────────

const loadedNamespaces = new Map<string, Record<string, unknown>>();

async function loadTranslation(lang: string): Promise<Record<string, unknown>> {
  if (loadedNamespaces.has(lang)) return loadedNamespaces.get(lang)!;
  try {
    const res  = await fetch(`/locales/${lang}.json`);
    const data = await res.json() as Record<string, unknown>;
    loadedNamespaces.set(lang, data);
    return data;
  } catch {
    return {};
  }
}

// ── Init ───────────────────────────────────────────────────────────────────────

// We load en synchronously via the inline backend approach.
// Other languages are lazy-loaded via the custom backend below.
i18n
  .use({
    type: 'backend',
    init() {},
    read(language: string, _namespace: string, callback: (err: unknown, data: unknown) => void) {
      loadTranslation(language)
        .then(data => callback(null, data))
        .catch(err => callback(err, null));
    },
  })
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANG_CODES,
    ns:            ['translation'],
    defaultNS:     'translation',
    detection: {
      // Section 4: auto-detect browser language, fall back to en
      order:               ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage:  'wk_language',
      cacheUserLanguage:   true,
    },
    interpolation: { escapeValue: false },
    react:         { useSuspense: false },
  });

// Apply dir on init and every language change
applyLangDir(i18n.language);
i18n.on('languageChanged', applyLangDir);

export default i18n;
