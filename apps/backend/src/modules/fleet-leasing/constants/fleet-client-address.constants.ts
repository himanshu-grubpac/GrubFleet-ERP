/** Structured address fields required for fleet client create (mirrors organisation clients). */
export const FLEET_CLIENT_STRUCTURED_ADDRESS_FIELDS = [
  'addressLine1',
  'addressCountry',
  'addressState',
  'addressDistrict',
  'addressPincode',
] as const;
