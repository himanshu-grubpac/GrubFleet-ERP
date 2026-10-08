import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";

function orgHeaders(organizationId: string, token: string) {
  return {
    token,
    headers: { "x-organization-id": organizationId },
  };
}

export type StockReceiptListItem = {
  id: string;
  receiptNumber: string;
  partName: string;
  partNumber: string;
  quantity: number;
  purchaseDate: string;
  batchReference: string;
  status: "active" | "inactive";
  availableActions: { edit: boolean };
};

export type StockReceiptDetail = {
  id: string;
  receiptNumber: string;
  partId: string;
  partLabel: string;
  supplierId: string | null;
  locationId: string;
  locationName: string;
  purchaseInvoiceReference: string | null;
  purchaseDate: string;
  expiryDate: string | null;
  quantityReceived: number;
  unitCostMinor: number;
  batchLotReference: string | null;
  notes: string | null;
  status: "active" | "inactive";
  availableActions: { edit: boolean };
};

export type CreateStockReceiptPayload = {
  organizationId: string;
  partId: string;
  supplierId?: string;
  locationId: string;
  purchaseInvoiceReference?: string;
  financeInvoiceId?: string;
  purchaseDate: string;
  expiryDate?: string;
  quantityReceived: number;
  quantityUnitCostMinor: number;
  batchLotReference?: string;
  notes?: string;
};

export type UpdateStockReceiptPayload = Partial<
  Omit<CreateStockReceiptPayload, "organizationId" | "partId">
>;

export type ListStockReceiptsParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "inactive";
};

export async function fetchStockReceiptsListApi(
  params: ListStockReceiptsParams,
  token: string,
): Promise<PaginatedResponse<StockReceiptListItem>> {
  const query = new URLSearchParams();
  query.set("organizationId", params.organizationId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status) query.set("status", params.status);

  return apiFetch<PaginatedResponse<StockReceiptListItem>>(
    `/inventory/stock-receipts?${query.toString()}`,
    { method: "GET", ...orgHeaders(params.organizationId, token) },
  );
}

export async function fetchStockReceiptDetailApi(
  organizationId: string,
  receiptId: string,
  token: string,
): Promise<StockReceiptDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<StockReceiptDetail>(
    `/inventory/stock-receipts/${receiptId}?${query.toString()}`,
    { method: "GET", ...orgHeaders(organizationId, token) },
  );
}

export async function createStockReceiptApi(
  payload: CreateStockReceiptPayload,
  token: string,
): Promise<StockReceiptDetail> {
  return apiFetch<StockReceiptDetail>(`/inventory/stock-receipts`, {
    method: "POST",
    body: JSON.stringify(payload),
    ...orgHeaders(payload.organizationId, token),
  });
}

export async function updateStockReceiptApi(
  organizationId: string,
  receiptId: string,
  payload: UpdateStockReceiptPayload,
  token: string,
): Promise<StockReceiptDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<StockReceiptDetail>(
    `/inventory/stock-receipts/${receiptId}?${query.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      ...orgHeaders(organizationId, token),
    },
  );
}

export async function updateStockReceiptStatusApi(
  organizationId: string,
  receiptId: string,
  body: { isActive: boolean; reason?: string },
  token: string,
): Promise<StockReceiptDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<StockReceiptDetail>(
    `/inventory/stock-receipts/${receiptId}/status?${query.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      ...orgHeaders(organizationId, token),
    },
  );
}
