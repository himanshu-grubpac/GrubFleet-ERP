import { z } from 'zod';

/** Organisation / ERP email storage cap — matches Drizzle varchar(320) and @MaxLength(320). */
export const EMAIL_STORAGE_MAX_LENGTH = 320;

const emailFormatSchema = z.string().email();

/**
 * Trim + lowercase for API/storage (matches typical @IsEmail DTO normalization).
 */
export function normalizeEmailForStorage(raw: string): string {
  return raw.trim().toLowerCase();
}

export function getEmailValidationError(raw: string): string | undefined {
  if (typeof raw !== 'string') {
    return 'Email must be a string';
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  if (trimmed.length > EMAIL_STORAGE_MAX_LENGTH) {
    return `Email must be at most ${EMAIL_STORAGE_MAX_LENGTH} characters`;
  }
  const parsed = emailFormatSchema.safeParse(trimmed);
  if (!parsed.success) {
    return 'Email format is invalid';
  }
  return undefined;
}

export function isValidEmail(raw: string): boolean {
  return getEmailValidationError(raw) === undefined;
}
