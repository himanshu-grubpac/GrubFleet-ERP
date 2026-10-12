export type FinancePurchaseTaxMode = "INCLUSIVE" | "EXCLUSIVE";

export type PurchaseVehicleLineTaxBreakdown = {
  baseAmountMinor: number;
  taxAmountMinor: number;
  lineTotalMinor: number;
};

export function computePurchaseVehicleLineTax(
  quantity: number,
  rateMinor: number,
  taxMode: FinancePurchaseTaxMode,
  vatPercent: number,
): PurchaseVehicleLineTaxBreakdown | null {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !Number.isInteger(rateMinor) ||
    rateMinor < 1 ||
    !Number.isInteger(vatPercent) ||
    vatPercent < 0 ||
    vatPercent > 100
  ) {
    return null;
  }
  const extended = rateMinor * quantity;
  if (!Number.isSafeInteger(extended)) return null;

  const taxAmountMinor = Math.round((extended * vatPercent) / 100);
  if (taxMode === "INCLUSIVE") {
    const lineTotalMinor = extended;
    const baseAmountMinor = lineTotalMinor - taxAmountMinor;
    if (baseAmountMinor < 0) return null;
    return { baseAmountMinor, taxAmountMinor, lineTotalMinor };
  }
  const baseAmountMinor = extended;
  const lineTotalMinor = baseAmountMinor + taxAmountMinor;
  if (!Number.isSafeInteger(lineTotalMinor) || lineTotalMinor < 1) return null;
  return { baseAmountMinor, taxAmountMinor, lineTotalMinor };
}
