/**
 * Static export (S3 + CloudFront): path-only shells; entity id in secure nav store.
 * @see lib/navigation/secure-entity-navigation.ts
 */

export type InventoryEntityQueryKey =
  | "partId"
  | "receiptId"
  | "partsRequestId";

const MODULE_BASE = {
  stockRegister: "/inventory/Stock-register",
  stockReceipt: "/inventory/stock-receipt",
  partsRequests: "/inventory/parts-requests",
  stockBalance: "/inventory/stock-balance",
} as const;

function detailHref(
  base: string,
  _queryKey: InventoryEntityQueryKey,
  _id: string,
): string {
  return `${base}/detail/`;
}

function editHref(
  base: string,
  _queryKey: InventoryEntityQueryKey,
  _id: string,
): string {
  return `${base}/edit/`;
}

export const inventoryStockRegisterListHref = `${MODULE_BASE.stockRegister}/`;
export const inventoryStockRegisterCreateHref = `${MODULE_BASE.stockRegister}/create/`;

export const inventoryStockRegisterDetailHref = (partId: string) =>
  detailHref(MODULE_BASE.stockRegister, "partId", partId);

export const inventoryStockRegisterEditHref = (partId: string) =>
  editHref(MODULE_BASE.stockRegister, "partId", partId);

export const inventoryStockReceiptListHref = `${MODULE_BASE.stockReceipt}/`;
export const inventoryStockReceiptCreateHref = `${MODULE_BASE.stockReceipt}/create/`;

export const inventoryStockReceiptDetailHref = (receiptId: string) =>
  detailHref(MODULE_BASE.stockReceipt, "receiptId", receiptId);

export const inventoryStockReceiptEditHref = (receiptId: string) =>
  editHref(MODULE_BASE.stockReceipt, "receiptId", receiptId);

export const inventoryPartsRequestsListHref = `${MODULE_BASE.partsRequests}/`;

export const inventoryPartsRequestDetailHref = (partsRequestId: string) =>
  detailHref(MODULE_BASE.partsRequests, "partsRequestId", partsRequestId);

export const inventoryStockBalanceListHref = `${MODULE_BASE.stockBalance}/`;

export const inventoryStockBalanceDetailHref = (partId: string) =>
  detailHref(MODULE_BASE.stockBalance, "partId", partId);
