export const SUPPORT_REPLACEMENT_VEHICLE_STORES = [
  'legacy',
  'register',
] as const;

export type SupportReplacementVehicleStore =
  (typeof SUPPORT_REPLACEMENT_VEHICLE_STORES)[number];

export const SUPPORT_REPLACEMENT_STORE_MISMATCH_MESSAGE =
  'Replacement vehicle must come from the same catalog as the on-lease unit (asset register or legacy fleet list).';
