import { normalizeDriverLicenseNumber } from '@grubpac/validation';

export function normalizeOrganisationDriverLicenseNumber(
  licenseNumber: string,
): string {
  return normalizeDriverLicenseNumber(licenseNumber);
}

export const ORGANISATION_DRIVER_LICENSE_DUPLICATE_MESSAGE =
  'A driver with this license number already exists in the organisation';
