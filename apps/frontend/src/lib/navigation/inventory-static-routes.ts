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

function detailHref(base: string): string {
  return `${base}/detail/`;
}

function editHref(base: string): string {
  return `${base}/edit/`;
}

export const inventoryStockRegisterListHref = `${MODULE_BASE.stockRegister}/`;
export const inventoryStockRegisterCreateHref = `${MODULE_BASE.stockRegister}/create/`;

export const inventoryStockRegisterDetailHref = (partId: string) => {
  void partId;
  return detailHref(MODULE_BASE.stockRegister);
};

export const inventoryStockRegisterEditHref = (partId: string) => {
  void partId;
  return editHref(MODULE_BASE.stockRegister);
};

export const inventoryStockReceiptListHref = `${MODULE_BASE.stockReceipt}/`;
export const inventoryStockReceiptCreateHref = `${MODULE_BASE.stockReceipt}/create/`;

export const inventoryStockReceiptDetailHref = (receiptId: string) => {
  void receiptId;
  return detailHref(MODULE_BASE.stockReceipt);
};

export const inventoryStockReceiptEditHref = (receiptId: string) => {
  void receiptId;
  return editHref(MODULE_BASE.stockReceipt);
};

export const inventoryPartsRequestsListHref = `${MODULE_BASE.partsRequests}/`;

export const inventoryPartsRequestDetailHref = (partsRequestId: string) => {
  void partsRequestId;
  return detailHref(MODULE_BASE.partsRequests);
};

export const inventoryStockBalanceListHref = `${MODULE_BASE.stockBalance}/`;

export const inventoryStockBalanceDetailHref = (partId: string) => {
  void partId;
  return detailHref(MODULE_BASE.stockBalance);
};
