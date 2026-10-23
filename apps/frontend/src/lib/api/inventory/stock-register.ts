import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";
import {
  DEFAULT_API_CATALOG_PAGE_SIZE,
  fetchAllPaginatedItems,
} from "../fetch-all-paginated";
import { serializeOrgScopedPatchBody } from "../omit-org-context-from-write-body";
import type { ListSortParams } from "@/lib/query/list-sort-params";
import { appendListSortSearchParams } from "@/lib/query/list-sort-params";

function orgHeaders(organizationId: string, token: string) {
  return {
    token,
    headers: { "x-organization-id": organizationId },
  };
}

export type StockRegisterListItem = {
  id: string;
  partName: string;
  partNumber: string;
  compatibleClass: string;
  unit: string;
  threshold: string;
  status: "active" | "inactive";
  availableActions: { edit: boolean };
};

export type StockRegisterDetail = {
  id: string;
  partName: string;
  partNumber: string;
  status: "active" | "inactive";
  compatibleAssetClasses: string[];
  unitOfMeasure: string;
  retailMarkup: string;
  wholesaleMarkup: string;
  threshold: string;
  brand: string | null;
  onHand: number;
  locationStock: Array<{ location: string; quantity: number }>;
  workOrderHistory: unknown[];
  availableActions: { edit: boolean };
};

export type CreateSparePartPayload = {
  organizationId: string;
  name: string;
  brand?: string;
  compatibleAssetClasses: string[];
  unitOfMeasure: string;
  retailMarkupPercent: number;
  wholesaleMarkupPercent: number;
  reorderThreshold: number;
};

export type UpdateSparePartPayload = Partial<
  Omit<CreateSparePartPayload, "organizationId">
>;

export type ListStockRegisterParams = ListSortParams & {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "inactive";
};

export async function fetchStockRegisterListApi(
  params: ListStockRegisterParams,
  token: string,
): Promise<PaginatedResponse<StockRegisterListItem>> {
  const query = new URLSearchParams();
  query.set("organizationId", params.organizationId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status) query.set("status", params.status);
  appendListSortSearchParams(query, params);

  return apiFetch<PaginatedResponse<StockRegisterListItem>>(
    `/inventory/stock-register?${query.toString()}`,
    { method: "GET", ...orgHeaders(params.organizationId, token) },
  );
}

/** Active spare parts for receipt / picker dropdowns (API max pageSize 50). */
export async function fetchAllActiveStockRegisterPartsApi(
  organizationId: string,
  token: string,
): Promise<StockRegisterListItem[]> {
  return fetchAllPaginatedItems(
    (page, pageSize) =>
      fetchStockRegisterListApi(
        { organizationId, page, pageSize, status: "active" },
        token,
      ),
    DEFAULT_API_CATALOG_PAGE_SIZE,
  );
}

export async function fetchStockRegisterDetailApi(
  organizationId: string,
  partId: string,
  token: string,
): Promise<StockRegisterDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<StockRegisterDetail>(
    `/inventory/stock-register/${partId}?${query.toString()}`,
    { method: "GET", ...orgHeaders(organizationId, token) },
  );
}

export async function createSparePartApi(
  payload: CreateSparePartPayload,
  token: string,
): Promise<StockRegisterDetail> {
  return apiFetch<StockRegisterDetail>(`/inventory/stock-register`, {
    method: "POST",
    body: JSON.stringify(payload),
    ...orgHeaders(payload.organizationId, token),
  });
}

export async function updateSparePartApi(
  organizationId: string,
  partId: string,
  payload: UpdateSparePartPayload,
  token: string,
): Promise<StockRegisterDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<StockRegisterDetail>(
    `/inventory/stock-register/${partId}?${query.toString()}`,
    {
      method: "PATCH",
      body: serializeOrgScopedPatchBody(payload),
      ...orgHeaders(organizationId, token),
    },
  );
}

export async function updateSparePartStatusApi(
  organizationId: string,
  partId: string,
  body: { isActive: boolean; reason?: string },
  token: string,
): Promise<StockRegisterDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<StockRegisterDetail>(
    `/inventory/stock-register/${partId}/status?${query.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      ...orgHeaders(organizationId, token),
    },
  );
}
