export type FinancePurchaseTaxMode = 'INCLUSIVE' | 'EXCLUSIVE';

export type PurchaseVehicleLineTaxBreakdown = {
  baseAmountMinor: number;
  taxAmountMinor: number;
  lineTotalMinor: number;
};

/** Per-unit rate in minor units; extended by quantity before tax rules. */
export function computePurchaseVehicleLineTax(
  quantity: number,
  rateMinor: number,
  taxMode: FinancePurchaseTaxMode,
  vatPercent: number,
): PurchaseVehicleLineTaxBreakdown {
  const extended = rateMinor * quantity;
  if (!Number.isSafeInteger(extended) || extended < 1) {
    throw new Error('Invalid line amount');
  }

  const taxAmountMinor = Math.round((extended * vatPercent) / 100);
  if (!Number.isSafeInteger(taxAmountMinor) || taxAmountMinor < 0) {
    throw new Error('Invalid tax amount');
  }

  if (taxMode === 'INCLUSIVE') {
    const lineTotalMinor = extended;
    const baseAmountMinor = lineTotalMinor - taxAmountMinor;
    if (baseAmountMinor < 0) {
      throw new Error('Invalid base amount');
    }
    return { baseAmountMinor, taxAmountMinor, lineTotalMinor };
  }

  const baseAmountMinor = extended;
  const lineTotalMinor = baseAmountMinor + taxAmountMinor;
  if (!Number.isSafeInteger(lineTotalMinor) || lineTotalMinor < 1) {
    throw new Error('Invalid line total');
  }
  return { baseAmountMinor, taxAmountMinor, lineTotalMinor };
}
