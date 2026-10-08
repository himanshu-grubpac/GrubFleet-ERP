import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";

function orgHeaders(organizationId: string, token: string) {
  return {
    token,
    headers: { "x-organization-id": organizationId },
  };
}

export type PartsRequestListItem = {
  id: string;
  date: string;
  workOrder: string;
  part: string;
  quantity: number;
  unit: string;
  location: string;
  requestType: "Internal" | "External";
  vehicle: string;
  status: "Blocked" | "Fulfilled";
};

export type PartsRequestDetail = PartsRequestListItem & {
  requestNumber: string;
  partId: string;
  rawStatus: string;
  compatibilityOk: boolean;
};

export type ListPartsRequestsParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  requestStatus?: string;
};

export async function fetchPartsRequestsListApi(
  params: ListPartsRequestsParams,
  token: string,
): Promise<PaginatedResponse<PartsRequestListItem>> {
  const query = new URLSearchParams();
  query.set("organizationId", params.organizationId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.requestStatus) query.set("requestStatus", params.requestStatus);

  return apiFetch<PaginatedResponse<PartsRequestListItem>>(
    `/inventory/parts-requests?${query.toString()}`,
    { method: "GET", ...orgHeaders(params.organizationId, token) },
  );
}

export async function fetchPartsRequestDetailApi(
  organizationId: string,
  requestId: string,
  token: string,
): Promise<PartsRequestDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<PartsRequestDetail>(
    `/inventory/parts-requests/${requestId}?${query.toString()}`,
    { method: "GET", ...orgHeaders(organizationId, token) },
  );
}
