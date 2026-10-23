/**
 * Static export (S3 + CloudFront): path-only shells; entity id in secure nav store.
 */

import { appendQueryToPath } from "./secure-entity-navigation";

export type FinanceEntityQueryKey = "invoiceId" | "clientId" | "paymentId";

const INVOICES_BASE = "/finance/invoices";
const CLIENT_STATEMENTS_BASE = "/finance/client-statements";
const VENDOR_PAYMENTS_BASE = "/finance/vendor-payments";

function detailHref(
  base: string,
  _queryKey: FinanceEntityQueryKey,
  _id: string,
): string {
  return `${base}/detail/`;
}

export const financeInvoiceDetailHref = (invoiceId: string) =>
  detailHref(INVOICES_BASE, "invoiceId", invoiceId);

export const financeInvoicesListHref = `${INVOICES_BASE}/`;
export const financeInvoiceNewTypeHref = `${INVOICES_BASE}/new/`;
export const financeInvoiceNewPurchaseHref = `${INVOICES_BASE}/new/purchase/`;
export const financeInvoiceNewSaleHref = `${INVOICES_BASE}/new/sale/`;
export const financeInvoiceNewBillingHref = `${INVOICES_BASE}/new/billing/`;

export const financeInvoiceEditSaleHref = (invoiceId: string) =>
  financeInvoiceNewSaleHref;

export const financeInvoiceEditBillingHref = (invoiceId: string) =>
  financeInvoiceNewBillingHref;

export const financeInvoiceRecordPaymentHref = (invoiceId: string) => {
  void invoiceId;
  return `${INVOICES_BASE}/detail/record-payment/`;
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
  void clientId;
  return appendQueryToPath(`${CLIENT_STATEMENTS_BASE}/detail/`, {
    periodStart,
    periodEnd,
  });
}
