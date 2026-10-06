import type { PaginatedResponse } from "@grubpac/shared-types";
import type { OrganizationAddress } from "@/components/common/OrganizationAddressForm";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { DEFAULT_COUNTRY_CODE, getCountryDefinition } from "@/lib/geo/countries";
import { apiFetch } from "../client";

export type ClientStatus = "active" | "inactive";

export type PointOfContact = {
  id: string;
  name: string;
  contactNumber: string;
  email: string;
  isPrimary: boolean;
};

export type OrganisationClientContractStatus =
  | "active"
  | "draft"
  | "completed"
  | "cancelled";

export type OrganisationClientContract = {
  id: string;
  assetClasses: string;
  startDate: string;
  status: OrganisationClientContractStatus;
};

export type OrganisationClientListItem = {
  id: string;
  clientName: string;
  primaryPoc: string;
  phone: string;
  email: string;
  contracts: number;
  status: ClientStatus;
};

export type OrganisationClientDetail = {
  id: string;
  clientName: string;
  status: ClientStatus;
  isActive: boolean;
  address: string;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressDistrict: string | null;
  addressPincode: string | null;
  addressCountry: string;
  pointsOfContact: PointOfContact[];
  contracts: OrganisationClientContract[];
  contractHistory: OrganisationClientContract[];
  contractCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrganisationClientRecord = {
  id: string;
  clientName: string;
  address: OrganizationAddress;
  pointsOfContact: PointOfContact[];
  status: ClientStatus;
  contracts: OrganisationClientContract[];
  createdAt: string;
  updatedAt: string;
};

export type ListOrganisationClientsParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ClientStatus;
};

export type CreateOrganisationClientPayload = {
  organizationId: string;
  clientName: string;
  addressLine1: string;
  addressLine2?: string;
  addressCity?: string;
  addressCountry: string;
  addressState: string;
  addressDistrict: string;
  addressPincode: string;
  pointsOfContact: Array<{
    name: string;
    contactNumber: string;
    email: string;
    isPrimary: boolean;
  }>;
};

export type UpdateOrganisationClientPayload = Partial<
  Omit<CreateOrganisationClientPayload, "organizationId">
> & {
  addressLine2?: string | null;
  addressCity?: string | null;
};

export const organisationClientsQueryKey = (organizationId: string) =>
  ["organization", "clients", organizationId] as const;

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export function mapClientDetailToRecord(
  detail: OrganisationClientDetail,
): OrganisationClientRecord {
  return {
    id: detail.id,
    clientName: detail.clientName,
    address: {
      line1: detail.addressLine1,
      line2: detail.addressLine2 ?? "",
      city: detail.addressCity ?? "",
      state: detail.addressState ?? "",
      district: detail.addressDistrict ?? "",
      pincode: detail.addressPincode ?? "",
      country: detail.addressCountry,
    },
    pointsOfContact: detail.pointsOfContact,
    status: detail.status,
    contracts: detail.contracts ?? detail.contractHistory ?? [],
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

/** Maps API detail → create/edit form shape used by `CreateClientPage`. */
export function clientDetailToFormData(detail: OrganisationClientDetail): {
  companyName: string;
  address: OrganizationAddress;
  pointsOfContact: PointOfContact[];
} {
  const record = mapClientDetailToRecord(detail);
  return {
    companyName: record.clientName,
    address: record.address,
    pointsOfContact: record.pointsOfContact,
  };
}

export async function fetchOrganisationClientsApi(
  token: string,
  params: ListOrganisationClientsParams,
): Promise<PaginatedResponse<OrganisationClientListItem>> {
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
  return apiFetch<PaginatedResponse<OrganisationClientListItem>>(
    `/organisation/clients?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchOrganisationClientByIdApi(
  token: string,
  organizationId: string,
  clientId: string,
): Promise<OrganisationClientDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationClientDetail>(
    `/organisation/clients/${clientId}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createOrganisationClientApi(
  token: string,
  payload: CreateOrganisationClientPayload,
): Promise<OrganisationClientDetail> {
  return apiFetch<OrganisationClientDetail>(`/organisation/clients`, {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}

export async function updateOrganisationClientApi(
  token: string,
  organizationId: string,
  clientId: string,
  payload: UpdateOrganisationClientPayload,
): Promise<OrganisationClientDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationClientDetail>(
    `/organisation/clients/${clientId}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateOrganisationClientStatusApi(
  token: string,
  organizationId: string,
  clientId: string,
  body: {
    action: "activate" | "deactivate";
    reason?: string;
  },
): Promise<OrganisationClientDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationClientDetail>(
    `/organisation/clients/${clientId}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    },
  );
}

export function buildClientPayloadFromForm(input: {
  organizationId: string;
  clientName: string;
  address: OrganizationAddress;
  pointsOfContact: PointOfContact[];
}): CreateOrganisationClientPayload {
  const addressCountry =
    input.address.country.trim().toUpperCase() || DEFAULT_COUNTRY_CODE;
  const addressCountryDef = getCountryDefinition(addressCountry);
  const addressState = input.address.state.trim();
  const addressDistrictTrimmed = input.address.district.trim();
  const addressCityTrimmed = input.address.city.trim();

  return {
    organizationId: input.organizationId,
    clientName: input.clientName.trim(),
    addressLine1: input.address.line1.trim(),
    addressLine2: input.address.line2.trim() || undefined,
    addressCity: addressCountryDef.showDistrict
      ? undefined
      : addressCityTrimmed || undefined,
    addressCountry,
    addressState,
    addressDistrict: addressCountryDef.showDistrict
      ? addressDistrictTrimmed
      : addressDistrictTrimmed || addressState,
    addressPincode: input.address.pincode.trim(),
    pointsOfContact: input.pointsOfContact.map((p) => ({
      name: p.name.trim(),
      contactNumber: normalizePhoneForApi(p.contactNumber),
      email: p.email.trim().toLowerCase(),
      isPrimary: p.isPrimary,
    })),
  };
}
