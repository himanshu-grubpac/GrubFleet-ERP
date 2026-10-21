export const CPR_NO_MAX_LENGTH = 20;

export const CPR_NO_PATTERN = /^[A-Za-z0-9-]+$/;

export function normalizeCprNo(raw: string): string {
  return raw.trim();
}

export function getCprNoValidationError(raw: string): string | undefined {
  if (typeof raw !== 'string') {
    return 'CPR number must be a string';
  }
  const normalized = normalizeCprNo(raw);
  if (!normalized) {
    return 'CPR number is required';
  }
  if (normalized.length > CPR_NO_MAX_LENGTH) {
    return `CPR number must be at most ${CPR_NO_MAX_LENGTH} characters`;
  }
  if (!CPR_NO_PATTERN.test(normalized)) {
    return 'CPR number may only contain letters, digits, and hyphens';
  }
  return undefined;
}

export function isValidCprNo(raw: string): boolean {
  return getCprNoValidationError(raw) === undefined;
}
