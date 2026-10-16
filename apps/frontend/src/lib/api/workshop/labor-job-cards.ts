import type { PaginatedResponse } from "@grubpac/shared-types";
import { fetchAllPaginatedItems } from "../fetch-all-paginated";
import { apiFetch } from "../client";
import { WORKSHOP_FORM_CATALOG_PAGE_SIZE } from "./catalog-page-size";

export type WorkshopLaborJobCardStatus = "active" | "inactive";

export type WorkshopLaborJobCardListItem = {
  id: string;
  name: string;
  description: string | null;
  laborChargeMinor: number;
  status: WorkshopLaborJobCardStatus;
  createdAt: string;
  updatedAt: string;
};

export type WorkshopLaborJobCardPartLine = {
  partId: string;
  partName: string;
  partCode: string | null;
  quantity: number;
  unitCostMinor?: number;
};

export type WorkshopLaborJobCardDetail = WorkshopLaborJobCardListItem & {
  parts: WorkshopLaborJobCardPartLine[];
};

export type ListWorkshopLaborJobCardsParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WorkshopLaborJobCardStatus;
};

export type CreateWorkshopLaborJobCardPayload = {
  organizationId: string;
  name: string;
  description?: string;
  laborChargeMinor: number;
  parts?: Array<{ partId: string; quantity: number }>;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

/** All labor job cards matching filters (paginates until complete). */
export async function fetchAllWorkshopLaborJobCardsApi(
  token: string,
  params: Omit<ListWorkshopLaborJobCardsParams, "page" | "pageSize">,
): Promise<WorkshopLaborJobCardListItem[]> {
  return fetchAllPaginatedItems(
    (page, pageSize) =>
      fetchWorkshopLaborJobCardsApi(token, { ...params, page, pageSize }),
    WORKSHOP_FORM_CATALOG_PAGE_SIZE,
  );
}

export async function fetchWorkshopLaborJobCardsApi(
  token: string,
  params: ListWorkshopLaborJobCardsParams,
): Promise<PaginatedResponse<WorkshopLaborJobCardListItem>> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.status) {
    query.set("status", params.status);
  }
  return apiFetch<PaginatedResponse<WorkshopLaborJobCardListItem>>(
    `/workshop/labor-job-cards?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchWorkshopLaborJobCardApi(
  token: string,
  organizationId: string,
  id: string,
): Promise<WorkshopLaborJobCardDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<WorkshopLaborJobCardDetail>(
    `/workshop/labor-job-cards/${encodeURIComponent(id)}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createWorkshopLaborJobCardApi(
  token: string,
  payload: CreateWorkshopLaborJobCardPayload,
): Promise<WorkshopLaborJobCardDetail> {
  return apiFetch<WorkshopLaborJobCardDetail>("/workshop/labor-job-cards", {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}

export type UpdateWorkshopLaborJobCardPayload = {
  organizationId: string;
  name?: string;
  description?: string | null;
  laborChargeMinor?: number;
  parts?: Array<{ partId: string; quantity: number }>;
};

export async function updateWorkshopLaborJobCardApi(
  token: string,
  id: string,
  payload: UpdateWorkshopLaborJobCardPayload,
): Promise<WorkshopLaborJobCardDetail> {
  const query = new URLSearchParams({ organizationId: payload.organizationId });
  return apiFetch<WorkshopLaborJobCardDetail>(
    `/workshop/labor-job-cards/${encodeURIComponent(id)}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(payload.organizationId),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateWorkshopLaborJobCardStatusApi(
  token: string,
  id: string,
  organizationId: string,
  action: "activate" | "deactivate",
  reason?: string,
): Promise<WorkshopLaborJobCardDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<WorkshopLaborJobCardDetail>(
    `/workshop/labor-job-cards/${encodeURIComponent(id)}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ action, reason }),
    },
  );
}
