/** Asset class paint / color code — letter first, alphanumeric + hyphen. */
export const COLOR_CODE_MAX_LENGTH = 32;

export const COLOR_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;

export function normalizeColorCode(raw: string): string {
  return raw.trim();
}

export function getColorCodeValidationError(raw: string): string | undefined {
  if (typeof raw !== 'string') {
    return 'Color code must be a string';
  }
  const normalized = normalizeColorCode(raw);
  if (!normalized) {
    return 'Color code is required';
  }
  if (normalized.length > COLOR_CODE_MAX_LENGTH) {
    return `Color code must be at most ${COLOR_CODE_MAX_LENGTH} characters`;
  }
  if (!COLOR_CODE_PATTERN.test(normalized)) {
    return 'Color code must start with a letter and contain only letters, digits, and hyphens';
  }
  return undefined;
}

export function isValidColorCode(raw: string): boolean {
  return getColorCodeValidationError(raw) === undefined;
}
