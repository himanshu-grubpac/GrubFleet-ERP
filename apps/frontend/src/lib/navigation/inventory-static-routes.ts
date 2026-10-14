/**
 * Static export (S3 + CloudFront): fixed shells; runtime id in query string.
 * @see docs/deployment/s3-cloudfront-portal.md
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
  queryKey: InventoryEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  const path = `${base}/detail/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
}

function editHref(
  base: string,
  queryKey: InventoryEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  const path = `${base}/edit/`;
  if (!trimmed) {
    return path;
  }
  return `${path}?${queryKey}=${encodeURIComponent(trimmed)}`;
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
