/**
 * Static export (S3 + CloudFront): fixed shells; runtime id in query string.
 */

export type FinanceEntityQueryKey = "invoiceId" | "clientId" | "paymentId";

const INVOICES_BASE = "/finance/invoices";
const CLIENT_STATEMENTS_BASE = "/finance/client-statements";
const VENDOR_PAYMENTS_BASE = "/finance/vendor-payments";

function detailHref(
  base: string,
  queryKey: FinanceEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  const path = `${base}/detail/`;
  if (!trimmed) return path;
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
}

export const financeInvoiceDetailHref = (invoiceId: string) =>
  detailHref(INVOICES_BASE, "invoiceId", invoiceId);

export const financeInvoicesListHref = `${INVOICES_BASE}/`;
export const financeInvoiceNewTypeHref = `${INVOICES_BASE}/new/`;
export const financeInvoiceNewPurchaseHref = `${INVOICES_BASE}/new/purchase/`;
export const financeInvoiceNewSaleHref = `${INVOICES_BASE}/new/sale/`;
export const financeInvoiceNewBillingHref = `${INVOICES_BASE}/new/billing/`;

export const financeInvoiceEditSaleHref = (invoiceId: string) =>
  `${financeInvoiceNewSaleHref}?invoiceId=${encodeURIComponent(invoiceId)}`;

export const financeInvoiceEditBillingHref = (invoiceId: string) =>
  `${financeInvoiceNewBillingHref}?invoiceId=${encodeURIComponent(invoiceId)}`;

export const financeInvoiceRecordPaymentHref = (invoiceId: string) => {
  const trimmed = invoiceId.trim();
  const path = `${INVOICES_BASE}/detail/record-payment/`;
  if (!trimmed) return path;
  return `${path}?invoiceId=${encodeURIComponent(trimmed)}`;
};

export const financeClientStatementsListHref = `${CLIENT_STATEMENTS_BASE}/`;

export const financeVendorPaymentsListHref = `${VENDOR_PAYMENTS_BASE}/`;
export const financeVendorPaymentRecordHref = `${VENDOR_PAYMENTS_BASE}/record/`;

export const financeVendorPaymentDetailHref = (paymentId: string) =>
  detailHref(VENDOR_PAYMENTS_BASE, "paymentId", paymentId);

export function financeClientStatementDetailHref(
  clientId: string,
  periodStart: string,
  periodEnd: string,
): string {
  const params = new URLSearchParams({
    clientId: clientId.trim(),
    periodStart,
    periodEnd,
  });
  return `${CLIENT_STATEMENTS_BASE}/detail/?${params.toString()}`;
}
