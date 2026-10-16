import type { PaginatedResponse } from "@grubpac/shared-types";
import { fetchAllPaginatedItems } from "../fetch-all-paginated";
import { apiFetch } from "../client";
import { WORKSHOP_FORM_CATALOG_PAGE_SIZE } from "./catalog-page-size";

export type WorkshopTechnicianListItem = {
  employeeId: string;
  fullName: string;
  openWorkOrderCount: number;
};

export type ListWorkshopTechniciansParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchWorkshopTechniciansApi(
  token: string,
  params: ListWorkshopTechniciansParams,
): Promise<PaginatedResponse<WorkshopTechnicianListItem>> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  return apiFetch<PaginatedResponse<WorkshopTechnicianListItem>>(
    `/workshop/technicians?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

/** All active workshop-flagged employees (paginates until complete). */
export async function fetchAllWorkshopTechniciansApi(
  token: string,
  organizationId: string,
): Promise<WorkshopTechnicianListItem[]> {
  return fetchAllPaginatedItems(
    (page, pageSize) =>
      fetchWorkshopTechniciansApi(token, {
        organizationId,
        page,
        pageSize,
      }),
    WORKSHOP_FORM_CATALOG_PAGE_SIZE,
  );
}
