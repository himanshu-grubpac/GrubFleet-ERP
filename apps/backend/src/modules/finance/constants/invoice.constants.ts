export const FINANCE_INVOICE_TYPES = ['purchase', 'sale', 'billing'] as const;

export type FinanceInvoiceType = (typeof FINANCE_INVOICE_TYPES)[number];

export const FINANCE_INVOICE_STATUSES = [
  'unpaid',
  'partially_paid',
  'paid',
  'cancelled',
] as const;

export type FinanceInvoiceStatus = (typeof FINANCE_INVOICE_STATUSES)[number];

export const FINANCE_PURCHASE_LINE_KINDS = ['vehicle', 'spare_parts'] as const;

export type FinancePurchaseLineKind =
  (typeof FINANCE_PURCHASE_LINE_KINDS)[number];

/** Amounts stored as integer minor units (paise) in DB and JSON. */
export const FINANCE_AMOUNT_SCALE = 100;

/** Prefix for org/year invoice numbers (shared sequence per org/year). */
export const FINANCE_PURCHASE_INVOICE_NUMBER_PREFIX = 'PINV';
export const FINANCE_SALE_INVOICE_NUMBER_PREFIX = 'SINV';
export const FINANCE_BILLING_INVOICE_NUMBER_PREFIX = 'BINV';
export const FINANCE_VENDOR_PAYMENT_NUMBER_PREFIX = 'VPAY';

const INVOICE_NUMBER_PREFIX: Record<FinanceInvoiceType, string> = {
  purchase: FINANCE_PURCHASE_INVOICE_NUMBER_PREFIX,
  sale: FINANCE_SALE_INVOICE_NUMBER_PREFIX,
  billing: FINANCE_BILLING_INVOICE_NUMBER_PREFIX,
};

export function formatInvoiceNumber(
  invoiceType: FinanceInvoiceType,
  year: number,
  sequence: number,
): string {
  const prefix = INVOICE_NUMBER_PREFIX[invoiceType];
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

/** @deprecated Use formatInvoiceNumber('purchase', ...) */
export function formatPurchaseInvoiceNumber(
  year: number,
  sequence: number,
): string {
  return formatInvoiceNumber('purchase', year, sequence);
}

export function formatVendorPaymentNumber(
  year: number,
  sequence: number,
): string {
  return `${FINANCE_VENDOR_PAYMENT_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Billable lease contract statuses for billing invoices. */
export const FINANCE_BILLABLE_LEASE_STATUSES = [
  'active',
  'awaiting_assets',
  'approved',
  'billing_paused',
] as const;
