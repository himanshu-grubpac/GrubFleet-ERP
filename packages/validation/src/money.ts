/**
 * Money policy (ERP):
 * - Finance ledger paths (invoices, payments, inventory unit costs): integer **paise** (minor units) in JSON.
 * - Fleet lease contract amounts (security deposit, line rates): **decimal string** matching DECIMAL_MONEY_PATTERN.
 * - Asset register insurance premium (numeric column): decimal string on write DTOs (same pattern as lease).
 */

/** Matches numeric(14,2) — up to 12 integer digits + optional cents. */
export const DECIMAL_MONEY_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

export const DECIMAL_MONEY_PATTERN_MESSAGE =
  'Must be a decimal amount with up to 12 digits and 2 decimal places';

export const FINANCE_AMOUNT_MINOR_SCALE = 100;
