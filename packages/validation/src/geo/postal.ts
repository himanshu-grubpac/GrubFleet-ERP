import { isValidIso31661Alpha2Country, normalizeCountryCode } from './country';

const GENERIC_POSTAL = /^[A-Za-z0-9][A-Za-z0-9\s-]{0,19}$/;

export const ADDRESS_POSTAL_MAX_LENGTH = 20;

export const ADDRESS_POSTAL_INVALID_FORMAT_MESSAGE =
  'addressPincode format is invalid';

export type PostalValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePostalForCountry(
  countryCode: string,
  postal: string,
): PostalValidationResult {
  const trimmed = postal.trim();
  if (!trimmed) {
    return { ok: false, message: 'addressPincode is required' };
  }
  if (trimmed.length > ADDRESS_POSTAL_MAX_LENGTH) {
    return {
      ok: false,
      message: `addressPincode must be at most ${ADDRESS_POSTAL_MAX_LENGTH} characters`,
    };
  }

  const normalizedCountry = normalizeCountryCode(countryCode);
  if (!isValidIso31661Alpha2Country(normalizedCountry)) {
    return {
      ok: false,
      message: 'addressCountry must be a valid ISO 3166-1 alpha-2 code',
    };
  }

  if (GENERIC_POSTAL.test(trimmed)) {
    return { ok: true };
  }

  return {
    ok: false,
    message: ADDRESS_POSTAL_INVALID_FORMAT_MESSAGE,
  };
}
