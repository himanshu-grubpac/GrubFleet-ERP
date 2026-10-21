/**
 * Generic vehicle registration / plate number rules (org-scoped fleet register).
 * Country-specific formats (e.g. strict Indian RTO patterns) can extend this later.
 */
export const VEHICLE_REGISTRATION_NUMBER_MIN_LENGTH = 4;
export const VEHICLE_REGISTRATION_NUMBER_MAX_LENGTH = 32;

/** Allowed after normalize: A–Z, 0–9, space, hyphen. */
export const VEHICLE_REGISTRATION_NUMBER_PATTERN = /^[A-Z0-9 -]+$/;

export function normalizeVehicleRegistrationNumber(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function getVehicleRegistrationValidationError(
  raw: string,
): string | undefined {
  if (typeof raw !== 'string') {
    return 'Registration number must be a string';
  }
  const normalized = normalizeVehicleRegistrationNumber(raw);
  if (normalized.length === 0) {
    return 'Registration number is required';
  }
  if (normalized.length < VEHICLE_REGISTRATION_NUMBER_MIN_LENGTH) {
    return `Registration number must be at least ${VEHICLE_REGISTRATION_NUMBER_MIN_LENGTH} characters`;
  }
  if (normalized.length > VEHICLE_REGISTRATION_NUMBER_MAX_LENGTH) {
    return `Registration number must be at most ${VEHICLE_REGISTRATION_NUMBER_MAX_LENGTH} characters`;
  }
  if (!VEHICLE_REGISTRATION_NUMBER_PATTERN.test(normalized)) {
    return 'Registration number may only contain letters, digits, spaces, and hyphens';
  }
  if (!/[A-Z]/.test(normalized)) {
    return 'Registration number must include at least one letter';
  }
  if (!/[0-9]/.test(normalized)) {
    return 'Registration number must include at least one digit';
  }
  return undefined;
}

export function isValidVehicleRegistrationNumber(raw: string): boolean {
  return getVehicleRegistrationValidationError(raw) === undefined;
}
