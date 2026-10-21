export const CHASSIS_VIN_MIN_LENGTH = 1;
export const CHASSIS_VIN_MAX_LENGTH = 64;

/** Alphanumeric chassis / VIN (hyphens allowed; no spaces). */
export const CHASSIS_VIN_PATTERN = /^[A-Za-z0-9-]+$/;

export function normalizeChassisVin(raw: string): string {
  return raw.trim().toUpperCase();
}

export function getChassisVinValidationError(raw: string): string | undefined {
  if (typeof raw !== 'string') {
    return 'Chassis / VIN must be a string';
  }
  const normalized = normalizeChassisVin(raw);
  if (normalized.length < CHASSIS_VIN_MIN_LENGTH) {
    return 'Chassis / VIN is required';
  }
  if (normalized.length > CHASSIS_VIN_MAX_LENGTH) {
    return `Chassis / VIN must be at most ${CHASSIS_VIN_MAX_LENGTH} characters`;
  }
  if (!CHASSIS_VIN_PATTERN.test(normalized)) {
    return 'Chassis / VIN may only contain letters, digits, and hyphens';
  }
  return undefined;
}

export function isValidChassisVin(raw: string): boolean {
  return getChassisVinValidationError(raw) === undefined;
}
