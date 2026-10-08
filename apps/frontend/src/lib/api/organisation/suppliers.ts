import type { PaginatedResponse } from "@grubpac/shared-types";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { DEFAULT_COUNTRY_CODE, getCountryDefinition } from "@/lib/geo/countries";
import { apiFetch } from "../client";

export type SupplierStatus = "active" | "inactive";

export type OrganisationSupplierTypeKey =
  | "bike"
  | "driver"
  | "spare_parts"
  | "compliance";

export type OrganisationSupplierTypeCatalogItem = {
  key: OrganisationSupplierTypeKey;
  label: string;
};

export type OrganisationSupplierListItem = {
  id: string;
  name: string;
  type: string;
  supplierType: OrganisationSupplierTypeKey;
  contactPerson: string;
  phone: string;
  email: string;
  status: SupplierStatus;
};

export type SupplierReliabilityItem = {
  incident: string;
  date: string;
  details: string;
};

export type SupplierLinkedSections = {
  reliability: {
    title: string;
    items: SupplierReliabilityItem[];
  } | null;
  linked: {
    title: string;
    items: Record<string, string | number>[];
    total?: number;
    page?: number;
    pageSize?: number;
  };
};

export type OrganisationSupplierDetail = OrganisationSupplierListItem & {
  agreementReference: string;
  address: string;
  addressLine1: string;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressDistrict: string | null;
  addressPincode: string | null;
  addressCountry: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  linkedSections: SupplierLinkedSections;
};

export type ListOrganisationSuppliersParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  supplierType?: OrganisationSupplierTypeKey | "spareparts";
  status?: SupplierStatus;
};

export type CreateOrganisationSupplierPayload = {
  organizationId: string;
  name: string;
  supplierType: OrganisationSupplierTypeKey;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  agreementReference?: string;
  addressLine1: string;
  addressLine2?: string;
  addressCity?: string;
  addressCountry: string;
  addressState: string;
  addressDistrict: string;
  addressPincode: string;
};

export type UpdateOrganisationSupplierPayload = Partial<
  Omit<CreateOrganisationSupplierPayload, "organizationId">
> & {
  agreementReference?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
};

const SUPPLIER_TYPE_LABEL_TO_KEY: Record<string, OrganisationSupplierTypeKey> =
  {
    Bike: "bike",
    Vehicle: "bike",
    Vehicles: "bike",
    Driver: "driver",
    Drivers: "driver",
    "Driver Staffing": "driver",
    "Spare parts": "spare_parts",
    "Spare Parts": "spare_parts",
    Parts: "spare_parts",
    Compliance: "compliance",
    Insurance: "compliance",
    RTO: "compliance",
    "RTO / Compliance": "compliance",
  };

const SUPPLIER_API_KEY_TO_FORM_LABEL: Record<
  OrganisationSupplierTypeKey,
  string
> = {
  bike: "Vehicles",
  spare_parts: "Parts",
  driver: "Drivers",
  compliance: "Compliance",
};

export function supplierFormTypeToApiKey(
  label: string,
): OrganisationSupplierTypeKey | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  return (
    SUPPLIER_TYPE_LABEL_TO_KEY[trimmed] ??
    (["bike", "driver", "spare_parts", "compliance"].includes(trimmed)
      ? (trimmed as OrganisationSupplierTypeKey)
      : null)
  );
}

/** Maps API detail to Khushi form chip labels (no UI label changes). */
export function supplierDetailTypeToFormLabel(
  typeLabel: string,
  supplierType: OrganisationSupplierTypeKey,
): string {
  return SUPPLIER_API_KEY_TO_FORM_LABEL[supplierType] ?? typeLabel;
}

export function supplierDetailToFormData(detail: OrganisationSupplierDetail): {
  name: string;
  type: string;
  contactPerson: string;
  phone: string;
  email: string;
  agreementReference: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    district: string;
    pincode: string;
    country: string;
  };
} {
  return {
    name: detail.name,
    type: supplierDetailTypeToFormLabel(detail.type, detail.supplierType),
    contactPerson: detail.contactPerson,
    phone: detail.phone,
    email: detail.email,
    agreementReference: detail.agreementReference ?? "",
    address: {
      line1: detail.addressLine1 ?? "",
      line2: detail.addressLine2 ?? "",
      city: detail.addressCity ?? "",
      state: detail.addressState ?? "",
      district: detail.addressDistrict ?? "",
      pincode: detail.addressPincode ?? "",
      country: detail.addressCountry ?? "",
    },
  };
}

export function supplierFilterToApiType(
  filter: string,
): ListOrganisationSuppliersParams["supplierType"] | undefined {
  if (!filter || filter === "all") return undefined;
  if (filter === "spareparts") return "spareparts";
  if (filter === "bike") return "bike";
  if (filter === "driver") return "driver";
  if (filter === "compliance") return "compliance";
  return undefined;
}

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchOrganisationSupplierTypesApi(
  token: string,
  organizationId: string,
): Promise<{ items: OrganisationSupplierTypeCatalogItem[] }> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<{ items: OrganisationSupplierTypeCatalogItem[] }>(
    `/organisation/suppliers/types?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function fetchOrganisationSuppliersApi(
  token: string,
  params: ListOrganisationSuppliersParams,
): Promise<PaginatedResponse<OrganisationSupplierListItem>> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.supplierType) {
    query.set("supplierType", params.supplierType);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  return apiFetch<PaginatedResponse<OrganisationSupplierListItem>>(
    `/organisation/suppliers?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchOrganisationSupplierByIdApi(
  token: string,
  organizationId: string,
  supplierId: string,
): Promise<OrganisationSupplierDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationSupplierDetail>(
    `/organisation/suppliers/${supplierId}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createOrganisationSupplierApi(
  token: string,
  payload: CreateOrganisationSupplierPayload,
): Promise<OrganisationSupplierDetail> {
  return apiFetch<OrganisationSupplierDetail>(`/organisation/suppliers`, {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}

export async function updateOrganisationSupplierApi(
  token: string,
  organizationId: string,
  supplierId: string,
  payload: UpdateOrganisationSupplierPayload,
): Promise<OrganisationSupplierDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationSupplierDetail>(
    `/organisation/suppliers/${supplierId}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateOrganisationSupplierStatusApi(
  token: string,
  organizationId: string,
  supplierId: string,
  body: {
    action: "activate" | "deactivate";
    reason?: string;
  },
): Promise<OrganisationSupplierDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<OrganisationSupplierDetail>(
    `/organisation/suppliers/${supplierId}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify(body),
    },
  );
}

export function buildSupplierPayloadFromForm(input: {
  organizationId: string;
  name: string;
  type: string;
  contactPerson: string;
  phone: string;
  email: string;
  agreementReference: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    district: string;
    pincode: string;
    country: string;
  };
}): CreateOrganisationSupplierPayload {
  const supplierType = supplierFormTypeToApiKey(input.type);
  if (!supplierType) {
    throw new Error("Invalid supplier type");
  }
  const addressCountry =
    input.address.country.trim().toUpperCase() || DEFAULT_COUNTRY_CODE;
  const addressCountryDef = getCountryDefinition(addressCountry);
  const addressState = input.address.state.trim();
  const addressDistrictTrimmed = input.address.district.trim();
  const addressCityTrimmed = input.address.city.trim();

  return {
    organizationId: input.organizationId,
    name: input.name.trim(),
    supplierType,
    contactPerson: input.contactPerson.trim(),
    contactPhone: normalizePhoneForApi(input.phone),
    contactEmail: input.email.trim(),
    agreementReference: input.agreementReference.trim() || undefined,
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
  };
}
