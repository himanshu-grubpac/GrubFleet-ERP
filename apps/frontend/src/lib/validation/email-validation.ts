/**
 * Canonical FE email validation — same truth as backend @IsEmail + @MaxLength(320)
 * via `@grubpac/validation` (mirrors phone in Commonvalidation).
 */
import {
  EMAIL_STORAGE_MAX_LENGTH,
  getEmailValidationError,
  isValidEmail,
  normalizeEmailForStorage,
} from "@grubpac/validation";

export {
  EMAIL_STORAGE_MAX_LENGTH,
  getEmailValidationError,
  isValidEmail,
  normalizeEmailForStorage,
};

/** Optional email fields: empty is valid; non-empty must pass package rules. */
export function isValidOptionalEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  return isValidEmail(trimmed);
}
