import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";

function orgHeaders(organizationId: string, token: string) {
  return {
    token,
    headers: { "x-organization-id": organizationId },
  };
}

export type StockBalanceListItem = {
  id: string;
  partName: string;
  partNumber: string;
  unit: string;
  threshold: number;
  locations: Array<{ location: string; quantity: number }>;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
};

export type StockBalanceDetail = {
  id: string;
  partName: string;
  partNumber: string;
  unit: string;
  threshold: number;
  onHand: number;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
  locations: Array<{ location: string; quantity: number }>;
};

export type ListStockBalanceParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

export async function fetchStockBalanceListApi(
  params: ListStockBalanceParams,
  token: string,
): Promise<PaginatedResponse<StockBalanceListItem>> {
  const query = new URLSearchParams();
  query.set("organizationId", params.organizationId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) query.set("search", params.search.trim());

  return apiFetch<PaginatedResponse<StockBalanceListItem>>(
    `/inventory/stock-balance?${query.toString()}`,
    { method: "GET", ...orgHeaders(params.organizationId, token) },
  );
}

export async function fetchStockBalanceDetailApi(
  organizationId: string,
  partId: string,
  token: string,
): Promise<StockBalanceDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<StockBalanceDetail>(
    `/inventory/stock-balance/${partId}?${query.toString()}`,
    { method: "GET", ...orgHeaders(organizationId, token) },
  );
}
