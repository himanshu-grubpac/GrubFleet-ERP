/** Sale/billing invoice payment methods (single source for DTO validation + API catalog). */
export const FINANCE_INVOICE_PAYMENT_METHODS = [
  'bank_transfer',
  'upi',
  'cheque',
  'cash',
  'card',
  'other',
] as const;

export type FinanceInvoicePaymentMethod =
  (typeof FINANCE_INVOICE_PAYMENT_METHODS)[number];

export const FINANCE_INVOICE_PAYMENT_METHOD_LABELS: Record<
  FinanceInvoicePaymentMethod,
  string
> = {
  bank_transfer: 'Bank transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};
