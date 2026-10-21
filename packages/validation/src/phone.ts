import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

/** Organisation / ERP phone storage cap — compact E.164 or digits. */
export const PHONE_STORAGE_MAX_LENGTH = 32;

/** ITU-T E.164 significant digits (excluding leading +). */
export const PHONE_E164_MAX_DIGITS = 15;

const COMPACT_PHONE = /^\+?[0-9]{7,15}$/;

function compactUnparsedPhone(raw: string): string {
  let compact = '';
  for (const char of raw.trim()) {
    if (char >= '0' && char <= '9') {
      compact += char;
      continue;
    }
    if (char === '+' && compact.length === 0) {
      compact += char;
    }
  }
  return compact.length <= PHONE_STORAGE_MAX_LENGTH
    ? compact
    : compact.slice(0, PHONE_STORAGE_MAX_LENGTH);
}

export function normalizePhoneForStorage(
  raw: string,
  defaultCountry?: CountryCode,
): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  const parsed =
    defaultCountry !== undefined
      ? parsePhoneNumberFromString(trimmed, defaultCountry) ??
        parsePhoneNumberFromString(trimmed)
      : parsePhoneNumberFromString(trimmed);

  if (parsed?.isValid()) {
    const e164 = parsed.format('E.164');
    return e164.length <= PHONE_STORAGE_MAX_LENGTH
      ? e164
      : e164.slice(0, PHONE_STORAGE_MAX_LENGTH);
  }

  return compactUnparsedPhone(trimmed);
}

export function getPhoneValidationError(
  raw: string,
  defaultCountry?: CountryCode,
): string | undefined {
  if (typeof raw !== 'string') {
    return 'Phone must be a string';
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'Phone is required';
  }
  if (trimmed.length > PHONE_STORAGE_MAX_LENGTH) {
    return `Phone must be at most ${PHONE_STORAGE_MAX_LENGTH} characters`;
  }

  const parsed =
    defaultCountry !== undefined
      ? parsePhoneNumberFromString(trimmed, defaultCountry) ??
        parsePhoneNumberFromString(trimmed)
      : parsePhoneNumberFromString(trimmed);

  if (parsed?.isValid()) {
    return undefined;
  }

  const compact = compactUnparsedPhone(trimmed);
  if (COMPACT_PHONE.test(compact)) {
    return undefined;
  }

  return 'Phone number format is invalid';
}

export function isValidPhone(raw: string, defaultCountry?: CountryCode): boolean {
  return getPhoneValidationError(raw, defaultCountry) === undefined;
}
