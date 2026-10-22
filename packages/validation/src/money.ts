/**
 * Money policy (ERP):
 * - Finance ledger paths (invoices, payments, inventory unit costs): integer **paise** (minor units) in JSON.
 * - Fleet lease contract amounts (security deposit, line rates): **decimal string** matching DECIMAL_MONEY_PATTERN.
 * - Asset register insurance premium: JSON **number** (major INR units, max 2 decimal places); stored numeric(14,2).
 */

/** Matches numeric(14,2) — up to 12 integer digits + optional cents. */
export const DECIMAL_MONEY_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

export const DECIMAL_MONEY_PATTERN_MESSAGE =
  'Must be a decimal amount with up to 12 digits and 2 decimal places';

export const FINANCE_AMOUNT_MINOR_SCALE = 100;

/** Canonical text form for DECIMAL_MONEY_PATTERN checks. */
export function decimalMoneyAmountToPatternText(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/** JSON number: non-negative, ≤12 integer digits, at most 2 decimal places. */
export function isValidDecimalMoneyNumber(value: number): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return false;
  }
  if (Math.abs(Math.round(value * 100) - value * 100) > 1e-6) {
    return false;
  }
  const text = decimalMoneyAmountToPatternText(value);
  return DECIMAL_MONEY_PATTERN.test(text);
}

/** Persist API major-unit number to numeric(14,2) column text. */
export function formatDecimalMoneyForStorage(value: number): string {
  return value.toFixed(2);
}
