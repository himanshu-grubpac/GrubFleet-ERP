import type { PaginatedResponse } from "@grubpac/shared-types";
import type { DriverFormData } from "@/components/modules/organization/driver-register/CreateDriverPage";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { DEFAULT_COUNTRY_CODE, getCountryDefinition } from "@/lib/geo/countries";
import { apiFetch } from "../client";

export type DriverStatus = "active" | "inactive";

export type OrganisationDriverListItem = {
  id: string;
  name: string;
  cprNo: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  supplier: string;
  supplierId: string;
  assignedVehicle?: string;
  vehicleTiedToContract?: boolean;
  status: DriverStatus;
};

export type OrganisationDriverDetail = OrganisationDriverListItem & {
  addressLocality: string;
  address: string;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressDistrict: string | null;
  addressPincode: string | null;
  addressCountry: string;
  assignedVehicleAssetClass: string | null;
  assignedActiveLeaseId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssignableVehicleListItem = {
  id: string;
  vehicleCode: string;
  assetClass: string;
  activeLeaseId: string;
};

export type ListOrganisationDriversParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: DriverStatus | "license-expired";
};

export type CreateOrganisationDriverPayload = {
  organizationId: string;
  name: string;
  cprNo: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  supplierId: string;
  addressLine1: string;
  addressLine2?: string;
  addressCity?: string;
  addressCountry: string;
  addressState: string;
  addressDistrict: string;
  addressPincode: string;
};

export type UpdateOrganisationDriverPayload = Partial<
  Omit<CreateOrganisationDriverPayload, "organizationId">
>;

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchOrganisationDriversApi(
  token: string,
  params: ListOrganisationDriversParams,
): Promise<PaginatedResponse<OrganisationDriverListItem>> {
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
  return apiFetch<PaginatedResponse<OrganisationDriverListItem>>(
    `/organisation/drivers?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchOrganisationDriverByIdApi(
  token: string,
  organizationId: string,
  driverId: string,
): Promise<OrganisationDriverDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationDriverDetail>(
    `/organisation/drivers/${driverId}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function fetchAssignableVehiclesApi(
  token: string,
  organizationId: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<AssignableVehicleListItem>> {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiFetch<PaginatedResponse<AssignableVehicleListItem>>(
    `/organisation/drivers/assignable-vehicles?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createOrganisationDriverApi(
  token: string,
  payload: CreateOrganisationDriverPayload,
): Promise<OrganisationDriverDetail> {
  return apiFetch<OrganisationDriverDetail>(`/organisation/drivers`, {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}

export async function updateOrganisationDriverApi(
  token: string,
  organizationId: string,
  driverId: string,
  payload: UpdateOrganisationDriverPayload,
): Promise<OrganisationDriverDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationDriverDetail>(
    `/organisation/drivers/${driverId}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateOrganisationDriverStatusApi(
  token: string,
  organizationId: string,
  driverId: string,
  body: {
    action: "activate" | "deactivate";
    reason?: string;
  },
): Promise<OrganisationDriverDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationDriverDetail>(
    `/organisation/drivers/${driverId}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    },
  );
}

export async function assignOrganisationDriverVehicleApi(
  token: string,
  organizationId: string,
  driverId: string,
  body: {
    vehicleCode: string;
    assetClass: string;
    activeLeaseId: string;
    vehicleTiedToContract?: boolean;
  },
): Promise<OrganisationDriverDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationDriverDetail>(
    `/organisation/drivers/${driverId}/assign?${query.toString()}`,
    {
      method: "POST",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    },
  );
}

export async function unassignOrganisationDriverVehicleApi(
  token: string,
  organizationId: string,
  driverId: string,
): Promise<OrganisationDriverDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationDriverDetail>(
    `/organisation/drivers/${driverId}/unassign?${query.toString()}`,
    {
      method: "POST",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

function buildDriverBodyFieldsFromForm(
  form: DriverFormData,
): Omit<CreateOrganisationDriverPayload, "organizationId"> {
  const addressCountry =
    form.address.country.trim().toUpperCase() || DEFAULT_COUNTRY_CODE;
  const addressCountryDef = getCountryDefinition(addressCountry);
  const addressState = form.address.state.trim();
  const addressDistrictTrimmed = form.address.district.trim();
  const addressCityTrimmed = form.address.city.trim();

  return {
    name: form.name.trim(),
    cprNo: form.cprNo.trim(),
    phone: normalizePhoneForApi(form.mobileNo),
    email: form.email.trim(),
    licenseNumber: form.drivingLicenseNo.trim(),
    licenseExpiry: form.licenseExpiryDate.trim(),
    supplierId: form.supplier.trim(),
    addressLine1: form.address.line1.trim(),
    addressLine2: form.address.line2.trim() || undefined,
    addressCity: addressCountryDef.showDistrict
      ? undefined
      : addressCityTrimmed || undefined,
    addressCountry,
    addressState,
    addressDistrict: addressCountryDef.showDistrict
      ? addressDistrictTrimmed
      : addressDistrictTrimmed || addressState,
    addressPincode: form.address.pincode.trim(),
  };
}

export function buildDriverPayloadFromForm(input: {
  organizationId: string;
  form: DriverFormData;
}): CreateOrganisationDriverPayload {
  return {
    organizationId: input.organizationId,
    ...buildDriverBodyFieldsFromForm(input.form),
  };
}

export function buildDriverUpdatePayloadFromForm(
  form: DriverFormData,
): UpdateOrganisationDriverPayload {
  return buildDriverBodyFieldsFromForm(form);
}

export function driverDetailToFormData(
  driver: OrganisationDriverDetail,
): Partial<DriverFormData> {
  return {
    name: driver.name,
    cprNo: driver.cprNo,
    mobileNo: driver.phone,
    email: driver.email,
    drivingLicenseNo: driver.licenseNumber,
    licenseExpiryDate: driver.licenseExpiry,
    supplier: driver.supplierId,
    address: {
      line1: driver.addressLine1,
      line2: driver.addressLine2 ?? "",
      city: driver.addressCity ?? "",
      state: driver.addressState ?? "",
      district: driver.addressDistrict ?? "",
      pincode: driver.addressPincode ?? "",
      country: driver.addressCountry,
    },
  };
}
