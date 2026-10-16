/** Trim + uppercase for org-scoped registration uniqueness (matches DB functional index). */
export function normalizeAssetRegisterRegistrationNumber(
  registrationNumber: string,
): string {
  return registrationNumber.trim().toUpperCase();
}

export const ASSET_REGISTER_REGISTRATION_DUPLICATE_MESSAGE =
  'A vehicle with this registration number already exists in the organisation';
