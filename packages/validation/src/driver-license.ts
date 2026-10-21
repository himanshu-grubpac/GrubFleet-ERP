/**
 * Driver driving-licence number (person — not vehicle registration plate).
 * Country-specific rules (e.g. strict state formats) can extend later.
 */
export const DRIVER_LICENSE_NUMBER_MIN_LENGTH = 4;
export const DRIVER_LICENSE_NUMBER_MAX_LENGTH = 64;

/** Allowed after normalize: A–Z, 0–9, space, hyphen, slash. */
export const DRIVER_LICENSE_NUMBER_PATTERN = /^[A-Z0-9/ -]+$/;

export function normalizeDriverLicenseNumber(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function getDriverLicenseValidationError(raw: string): string | undefined {
  if (typeof raw !== 'string') {
    return 'License number must be a string';
  }
  const normalized = normalizeDriverLicenseNumber(raw);
  if (normalized.length === 0) {
    return 'License number is required';
  }
  if (normalized.length < DRIVER_LICENSE_NUMBER_MIN_LENGTH) {
    return `License number must be at least ${DRIVER_LICENSE_NUMBER_MIN_LENGTH} characters`;
  }
  if (normalized.length > DRIVER_LICENSE_NUMBER_MAX_LENGTH) {
    return `License number must be at most ${DRIVER_LICENSE_NUMBER_MAX_LENGTH} characters`;
  }
  if (!DRIVER_LICENSE_NUMBER_PATTERN.test(normalized)) {
    return 'License number may only contain letters, digits, spaces, hyphens, and slashes';
  }
  if (!/[A-Z]/.test(normalized)) {
    return 'License number must include at least one letter';
  }
  if (!/[0-9]/.test(normalized)) {
    return 'License number must include at least one digit';
  }
  return undefined;
}

export function isValidDriverLicenseNumber(raw: string): boolean {
  return getDriverLicenseValidationError(raw) === undefined;
}
