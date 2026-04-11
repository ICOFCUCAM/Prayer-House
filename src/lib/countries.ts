// Section 2 — Full ISO-3166 country list via i18n-iso-countries
import countries from 'i18n-iso-countries';
import enLocale  from 'i18n-iso-countries/langs/en.json';

// Register English locale once
countries.registerLocale(enLocale);

export interface CountryOption {
  code: string; // ISO-3166 alpha-2 (e.g. "US", "NG")
  name: string; // English display name
}

let _cache: CountryOption[] | null = null;

/** Returns all ~250 countries sorted alphabetically by English name. */
export function getAllCountries(): CountryOption[] {
  if (_cache) return _cache;
  const names = countries.getNames('en', { select: 'official' });
  _cache = Object.entries(names)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return _cache;
}

/** Returns the English name for a given alpha-2 code, or the code itself if unknown. */
export function getCountryName(code: string): string {
  return countries.getName(code, 'en') ?? code;
}
