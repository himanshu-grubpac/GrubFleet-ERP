import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";
import { fetchAllPaginatedItems } from "../fetch-all-paginated";
import { serializeOrgScopedPatchBody } from "../omit-org-context-from-write-body";
import type { ListSortParams } from "@/lib/query/list-sort-params";
import { appendListSortSearchParams } from "@/lib/query/list-sort-params";

export type LocationStatus = "active" | "inactive";

export type OrganisationLocationListItem = {
  id: string;
  name: string;
  type: string;
  locationTypeId: string;
  address: string;
  responsiblePerson: string;
  email: string;
  phone: string;
  status: LocationStatus;
};

export type OrganisationLocationDetail = OrganisationLocationListItem & {
  typePresetKey: string | null;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressDistrict: string | null;
  addressPincode: string | null;
  addressCountry: string;
  siteContactPhone: string | null;
  siteContactEmail: string | null;
  responsibleEmployeeId: string | null;
  deputyEmployeeId: string | null;
  responsiblePersonPhone?: string;
  responsiblePersonEmail?: string;
  deputyName: string;
  deputyPhone?: string;
  deputyEmail?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Matches backend `LOCATION_LIST_MAX_PAGE_SIZE` for form dropdowns. */
export const ORGANISATION_LOCATION_FORM_PICKER_PAGE_SIZE = 200;

export type ListOrganisationLocationsParams = ListSortParams & {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  locationTypeId?: string;
  status?: LocationStatus;
};

export type CreateOrganisationLocationPayload = {
  organizationId: string;
  name: string;
  locationTypeId: string;
  addressLine1: string;
  addressLine2?: string;
  addressCountry: string;
  addressState: string;
  addressDistrict: string;
  addressPincode: string;
  siteContactPhone?: string;
  siteContactEmail?: string;
  responsibleEmployeeId?: string | null;
  deputyEmployeeId?: string | null;
};

export type UpdateOrganisationLocationPayload = Partial<
  Omit<
    CreateOrganisationLocationPayload,
    | "organizationId"
    | "siteContactPhone"
    | "siteContactEmail"
    | "responsibleEmployeeId"
    | "deputyEmployeeId"
  >
> & {
  siteContactPhone?: string | null;
  siteContactEmail?: string | null;
  /** `null` clears a saved responsible person. Omit keeps the current person. */
  responsibleEmployeeId?: string | null;
  /** `null` clears a saved deputy. Omit keeps the current deputy. */
  deputyEmployeeId?: string | null;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchOrganisationLocationsApi(
  token: string,
  params: ListOrganisationLocationsParams,
): Promise<PaginatedResponse<OrganisationLocationListItem>> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.locationTypeId) {
    query.set("locationTypeId", params.locationTypeId);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  appendListSortSearchParams(query, params);
  return apiFetch<PaginatedResponse<OrganisationLocationListItem>>(
    `/organisation/locations?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchAllActiveOrganisationLocationsApi(
  token: string,
  organizationId: string,
): Promise<OrganisationLocationListItem[]> {
  return fetchAllPaginatedItems(
    (page, pageSize) =>
      fetchOrganisationLocationsApi(token, {
        organizationId,
        page,
        pageSize,
        status: "active",
      }),
    ORGANISATION_LOCATION_FORM_PICKER_PAGE_SIZE,
  );
}

export async function fetchOrganisationLocationByIdApi(
  token: string,
  organizationId: string,
  locationId: string,
): Promise<OrganisationLocationDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationLocationDetail>(
    `/organisation/locations/${locationId}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createOrganisationLocationApi(
  token: string,
  payload: CreateOrganisationLocationPayload,
): Promise<OrganisationLocationDetail> {
  return apiFetch<OrganisationLocationDetail>(`/organisation/locations`, {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}

export async function updateOrganisationLocationApi(
  token: string,
  organizationId: string,
  locationId: string,
  payload: UpdateOrganisationLocationPayload,
): Promise<OrganisationLocationDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationLocationDetail>(
    `/organisation/locations/${locationId}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: serializeOrgScopedPatchBody(payload),
    },
  );
}

export async function updateOrganisationLocationStatusApi(
  token: string,
  organizationId: string,
  locationId: string,
  body: {
    action: "activate" | "deactivate";
    reason?: string;
  },
): Promise<OrganisationLocationDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationLocationDetail>(
    `/organisation/locations/${locationId}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    },
  );
}
