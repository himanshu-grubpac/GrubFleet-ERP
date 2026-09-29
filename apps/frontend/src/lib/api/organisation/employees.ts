import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";

export type EmployeeStatus = "active" | "inactive";

export type EmploymentType = "full_time" | "part_time" | "contract";

export type DeactivateReasonType =
  | "resignation"
  | "termination"
  | "end_of_contract"
  | "other";

export type OrganisationEmployeeListItem = {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  location: string;
  reportsToId: string | null;
  reportsToName: string | null;
  employmentType: EmploymentType;
  dateOfJoining: string;
  phone: string;
  email: string;
  status: EmployeeStatus;
};

export type OrganisationEmployeeDetail = OrganisationEmployeeListItem & {
  locationId: string | null;
  deactivateReasonType: string | null;
  deactivateComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganisationEmployeeDepartmentsResponse = {
  items: string[];
};

export type ListOrganisationEmployeesParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
  status?: EmployeeStatus;
};

export type CreateOrganisationEmployeePayload = {
  organizationId: string;
  fullName: string;
  designation: string;
  department: string;
  locationId: string;
  employmentType: EmploymentType;
  dateOfJoining: string;
  phone: string;
  email: string;
  branchLocationLabel?: string;
  reportsToEmployeeId?: string;
};

export type UpdateOrganisationEmployeePayload = Partial<
  Omit<
    CreateOrganisationEmployeePayload,
    "organizationId" | "locationId" | "reportsToEmployeeId" | "branchLocationLabel"
  >
> & {
  locationId?: string | null;
  reportsToEmployeeId?: string | null;
  branchLocationLabel?: string | null;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchOrganisationEmployeeDepartmentsApi(
  token: string,
  organizationId: string,
): Promise<OrganisationEmployeeDepartmentsResponse> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationEmployeeDepartmentsResponse>(
    `/organisation/employees/departments?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function fetchOrganisationEmployeesApi(
  token: string,
  params: ListOrganisationEmployeesParams,
): Promise<PaginatedResponse<OrganisationEmployeeListItem>> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.department?.trim()) {
    query.set("department", params.department.trim());
  }
  if (params.status) {
    query.set("status", params.status);
  }
  return apiFetch<PaginatedResponse<OrganisationEmployeeListItem>>(
    `/organisation/employees?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchOrganisationEmployeeByIdApi(
  token: string,
  organizationId: string,
  employeeId: string,
): Promise<OrganisationEmployeeDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationEmployeeDetail>(
    `/organisation/employees/${employeeId}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createOrganisationEmployeeApi(
  token: string,
  payload: CreateOrganisationEmployeePayload,
): Promise<OrganisationEmployeeDetail> {
  return apiFetch<OrganisationEmployeeDetail>(`/organisation/employees`, {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}

export async function updateOrganisationEmployeeApi(
  token: string,
  organizationId: string,
  employeeId: string,
  payload: UpdateOrganisationEmployeePayload,
): Promise<OrganisationEmployeeDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationEmployeeDetail>(
    `/organisation/employees/${employeeId}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateOrganisationEmployeeStatusApi(
  token: string,
  organizationId: string,
  employeeId: string,
  body: {
    action: "activate" | "deactivate";
    reasonType?: DeactivateReasonType;
    comment?: string;
  },
): Promise<OrganisationEmployeeDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationEmployeeDetail>(
    `/organisation/employees/${employeeId}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    },
  );
}
