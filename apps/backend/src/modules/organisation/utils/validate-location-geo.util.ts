import {
  isValidIso31661Alpha2Country,
  normalizeCountryCode,
  validatePostalForCountry,
} from '@grubpac/validation';
import { BadRequestException } from '@nestjs/common';

export function assertValidLocationCountry(country: string): string {
  const normalized = normalizeCountryCode(country);
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new BadRequestException(
      'addressCountry must be a 2-letter ISO 3166-1 alpha-2 code',
    );
  }
  if (!isValidIso31661Alpha2Country(normalized)) {
    throw new BadRequestException(
      `addressCountry is not a valid ISO country code: ${normalized}`,
    );
  }
  return normalized;
}

export function assertValidLocationPostal(
  countryCode: string,
  postal: string,
): void {
  const result = validatePostalForCountry(countryCode, postal);
  if (!result.ok) {
    throw new BadRequestException(result.message);
  }
}
