import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const INVOICE_LIST_SORT_FIELDS = [
  'invoiceDate',
  'invoiceNumber',
  'status',
  'createdAt',
] as const;
export type InvoiceListSortField = (typeof INVOICE_LIST_SORT_FIELDS)[number];
export const INVOICE_LIST_DEFAULT_SORT: ResolvedListSort<InvoiceListSortField> =
  {
    sortBy: 'invoiceDate',
    sortOrder: 'desc',
  };

export const VENDOR_PAYMENT_LIST_SORT_FIELDS = [
  'paymentDate',
  'paymentNumber',
  'createdAt',
] as const;
export type VendorPaymentListSortField =
  (typeof VENDOR_PAYMENT_LIST_SORT_FIELDS)[number];
export const VENDOR_PAYMENT_LIST_DEFAULT_SORT: ResolvedListSort<VendorPaymentListSortField> =
  { sortBy: 'paymentDate', sortOrder: 'desc' };

export const CLIENT_STATEMENT_LIST_SORT_FIELDS = [
  'periodStart',
  'clientName',
] as const;
export type ClientStatementListSortField =
  (typeof CLIENT_STATEMENT_LIST_SORT_FIELDS)[number];
export const CLIENT_STATEMENT_LIST_DEFAULT_SORT: ResolvedListSort<ClientStatementListSortField> =
  { sortBy: 'periodStart', sortOrder: 'desc' };

export const FINANCE_INVENTORY_PART_LIST_SORT_FIELDS = ['name', 'sku'] as const;
export type FinanceInventoryPartListSortField =
  (typeof FINANCE_INVENTORY_PART_LIST_SORT_FIELDS)[number];
export const FINANCE_INVENTORY_PART_LIST_DEFAULT_SORT: ResolvedListSort<FinanceInventoryPartListSortField> =
  { sortBy: 'name', sortOrder: 'asc' };
