/** Provisional rate card until Finance publishes official values (TSV Flow 01). */
export const STANDARD_RATE_CARD_INR: Record<string, string> = {
  Sedan: '34500',
  SUV: '41000',
  Pickup: '28000',
  Van: '32000',
  Hatchback: '28000',
};

export function isRateOnStandardCard(
  assetClass: string,
  ratePerVehicleMonth: string,
): boolean {
  const standard = STANDARD_RATE_CARD_INR[assetClass];
  if (!standard) {
    return false;
  }
  return Number(ratePerVehicleMonth) === Number(standard);
}
