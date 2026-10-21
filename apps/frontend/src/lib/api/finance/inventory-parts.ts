import type { PaginatedResponse } from "@grubpac/shared-types";
import type { ListSortParams } from "@/lib/query/list-sort-params";
import { appendListSortSearchParams } from "@/lib/query/list-sort-params";
import { apiFetch } from "../client";

export type InventoryPartCatalogItem = {
  id: string;
  name: string;
  partCode: string | null;
};

export async function fetchInventoryPartsCatalogApi(
  token: string,
  organizationId: string,
  params?: ListSortParams & {
    page?: number;
    pageSize?: number;
    search?: string;
  },
): Promise<PaginatedResponse<InventoryPartCatalogItem>> {
  const q = new URLSearchParams();
  q.set("organizationId", organizationId);
  q.set("page", String(params?.page ?? 1));
  q.set("pageSize", String(params?.pageSize ?? 50));
  if (params?.search?.trim()) q.set("search", params.search.trim());
  appendListSortSearchParams(q, params);

  return apiFetch(`/finance/inventory-parts?${q.toString()}`, {
    method: "GET",
    token,
    headers: { "x-organization-id": organizationId },
  });
}

export async function createInventoryPartCatalogApi(
  token: string,
  organizationId: string,
  body: { name: string; partCode?: string },
): Promise<InventoryPartCatalogItem> {
  return apiFetch("/finance/inventory-parts", {
    method: "POST",
    token,
    headers: { "x-organization-id": organizationId },
    body: JSON.stringify({ organizationId, ...body }),
  });
}
