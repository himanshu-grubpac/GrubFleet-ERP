import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const INVENTORY_PART_LIST_SORT_FIELDS = [
  'createdAt',
  'name',
  'sku',
  'updatedAt',
] as const;
export type InventoryPartListSortField =
  (typeof INVENTORY_PART_LIST_SORT_FIELDS)[number];
export const INVENTORY_PART_LIST_DEFAULT_SORT: ResolvedListSort<InventoryPartListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const PARTS_REQUEST_LIST_SORT_FIELDS = [
  'requestedAt',
  'status',
  'requestNumber',
] as const;
export type PartsRequestListSortField =
  (typeof PARTS_REQUEST_LIST_SORT_FIELDS)[number];
export const PARTS_REQUEST_LIST_DEFAULT_SORT: ResolvedListSort<PartsRequestListSortField> =
  { sortBy: 'requestedAt', sortOrder: 'desc' };

export const STOCK_RECEIPT_LIST_SORT_FIELDS = [
  'createdAt',
  'receiptNumber',
] as const;
export type StockReceiptListSortField =
  (typeof STOCK_RECEIPT_LIST_SORT_FIELDS)[number];
export const STOCK_RECEIPT_LIST_DEFAULT_SORT: ResolvedListSort<StockReceiptListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };
