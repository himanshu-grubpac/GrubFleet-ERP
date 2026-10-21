/** Indian GSTIN — 15 characters with embedded PAN. */
export const GSTIN_LENGTH = 15;

export const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function normalizeGstin(raw: string): string {
  return raw.trim().toUpperCase();
}

export function getGstinValidationError(raw: string): string | undefined {
  if (typeof raw !== 'string') {
    return 'Tax ID must be a string';
  }
  const normalized = normalizeGstin(raw);
  if (!normalized) {
    return 'Tax ID is required';
  }
  if (normalized.length !== GSTIN_LENGTH) {
    return `Tax ID must be exactly ${GSTIN_LENGTH} characters (GSTIN)`;
  }
  if (!GSTIN_PATTERN.test(normalized)) {
    return 'Tax ID must be a valid GSTIN format';
  }
  return undefined;
}

export function isValidGstin(raw: string): boolean {
  return getGstinValidationError(raw) === undefined;
}
