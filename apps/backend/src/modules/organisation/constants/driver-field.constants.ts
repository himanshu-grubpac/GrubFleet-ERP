/**
 * Organisation driver field max lengths — mirror `organisation_drivers` Drizzle columns
 * and CreateDriverDto / UpdateDriverDto validators.
 */
export const ORGANISATION_DRIVER_FIELD_LIMITS = {
  name: 255,
  cprNo: 20,
  phone: 32,
  email: 320,
  licenseNumber: 64,
  addressLine: 255,
  addressRegion: 120,
  addressPincode: 20,
  addressCountry: 2,
  assignedVehicleCode: 64,
  assignedVehicleAssetClass: 255,
  assignedActiveLeaseId: 64,
} as const;
