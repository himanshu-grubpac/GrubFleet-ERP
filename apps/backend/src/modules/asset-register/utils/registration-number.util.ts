import { normalizeVehicleRegistrationNumber } from '@grubpac/validation';

/** Trim, collapse spaces, uppercase — shared with DTO validation and uniqueness checks. */
export function normalizeAssetRegisterRegistrationNumber(
  registrationNumber: string,
): string {
  return normalizeVehicleRegistrationNumber(registrationNumber);
}

export const ASSET_REGISTER_REGISTRATION_DUPLICATE_MESSAGE =
  'A vehicle with this registration number already exists in the organisation';
