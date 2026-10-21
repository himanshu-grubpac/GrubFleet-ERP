/** Structured IN address for fleet client integration payloads. */
export function fleetClientStructuredAddressIn(overrides?: {
  addressLine1?: string;
  addressPincode?: string;
}) {
  return {
    addressLine1: overrides?.addressLine1 ?? '100 Business Park',
    addressCountry: 'IN',
    addressState: 'Maharashtra',
    addressDistrict: 'Mumbai',
    addressPincode: overrides?.addressPincode ?? '400001',
  };
}
