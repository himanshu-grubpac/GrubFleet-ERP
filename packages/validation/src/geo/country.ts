import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';

let localeRegistered = false;

function ensureLocale(): void {
  if (!localeRegistered) {
    countries.registerLocale(en);
    localeRegistered = true;
  }
}

export function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

/** True when `code` is a known ISO 3166-1 alpha-2 code (maintained dataset). */
export function isValidIso31661Alpha2Country(code: string): boolean {
  const normalized = normalizeCountryCode(code);
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return false;
  }
  ensureLocale();
  return countries.alpha2ToAlpha3(normalized) !== undefined;
}

export function getCountryNameEn(
  code: string | null | undefined,
): string | undefined {
  const normalized = normalizeCountryCode(code ?? '');
  if (!isValidIso31661Alpha2Country(normalized)) {
    return undefined;
  }
  ensureLocale();
  return countries.getName(normalized, 'en');
}
