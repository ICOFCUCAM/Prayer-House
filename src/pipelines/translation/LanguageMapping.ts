// Language mapping for translation, subtitle, and discovery routing

export interface LanguageConfig {
  code:       string;
  name:       string;
  flag:       string;
  nativeName: string;
  trackCount: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en',  name: 'English',    flag: '🇬🇧', nativeName: 'English',    trackCount: '4,200+' },
  { code: 'fr',  name: 'French',     flag: '🇫🇷', nativeName: 'Français',   trackCount: '1,800+' },
  { code: 'es',  name: 'Spanish',    flag: '🇪🇸', nativeName: 'Español',    trackCount: '2,100+' },
  { code: 'ar',  name: 'Arabic',     flag: '🇸🇦', nativeName: 'عربي',       trackCount: '980+'   },
  { code: 'pid', name: 'Pidgin',     flag: '🌍',  nativeName: 'Pidgin',     trackCount: '640+'   },
  { code: 'yo',  name: 'Yoruba',     flag: '🌍',  nativeName: 'Yorùbá',     trackCount: '1,200+' },
  { code: 'ig',  name: 'Igbo',       flag: '🇳🇬', nativeName: 'Igbo',       trackCount: '430+'   },
  { code: 'ha',  name: 'Hausa',      flag: '🇳🇬', nativeName: 'Hausa',      trackCount: '520+'   },
  { code: 'sw',  name: 'Swahili',    flag: '🇰🇪', nativeName: 'Kiswahili',  trackCount: '720+'   },
  { code: 'de',  name: 'German',     flag: '🇩🇪', nativeName: 'Deutsch',    trackCount: '510+'   },
  { code: 'no',  name: 'Norwegian',  flag: '🇳🇴', nativeName: 'Norsk',      trackCount: '290+'   },
  { code: 'sv',  name: 'Swedish',    flag: '🇸🇪', nativeName: 'Svenska',    trackCount: '270+'   },
  { code: 'pt',  name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português',  trackCount: '890+'   },
  { code: 'ru',  name: 'Russian',    flag: '🇷🇺', nativeName: 'Русский',    trackCount: '350+'   },
  { code: 'zh',  name: 'Chinese',    flag: '🇨🇳', nativeName: '中文',        trackCount: '430+'   },
  { code: 'ja',  name: 'Japanese',   flag: '🇯🇵', nativeName: '日本語',       trackCount: '310+'   },
  { code: 'zu',  name: 'Zulu',       flag: '🌍',  nativeName: 'isiZulu',    trackCount: '180+'   },
  { code: 'lg',  name: 'Luganda',    flag: '🌍',  nativeName: 'Luganda',    trackCount: '140+'   },
  { code: 'bm',  name: 'Bamumbu',    flag: '🌍',  nativeName: 'Bamumbu',    trackCount: '90+'    },
  { code: 'bk',  name: 'Bameleke',   flag: '🌍',  nativeName: 'Bameleke',   trackCount: '75+'    },
];

export const TRANSLATION_TARGET_LANGUAGES = [
  'fr', 'no', 'sw', 'zu', 'de', 'ru', 'bm', 'lg', 'es', 'ar', 'zh',
];

export const SUBTITLE_LANGUAGES = [
  'en', 'fr', 'no', 'sw', 'de', 'es', 'ar', 'zh', 'zu', 'bm', 'lg', 'ru', 'pid', 'yo', 'pt',
];

export function getLanguageByCode(code: string): LanguageConfig | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}

export function getLanguageName(code: string): string {
  return getLanguageByCode(code)?.name ?? code.toUpperCase();
}
