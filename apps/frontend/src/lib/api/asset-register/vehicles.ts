import type { PaginatedResponse } from "@grubpac/shared-types";
import { fetchAllPaginatedItems } from "../fetch-all-paginated";
import { apiFetch } from "../client";
import { serializeOrgScopedPatchBody } from "../omit-org-context-from-write-body";
import type { ListSortParams } from "@/lib/query/list-sort-params";
import { appendListSortSearchParams } from "@/lib/query/list-sort-params";
import type { AssetRegisterClassStatus } from "./asset-classes";

export type AssetRegisterVehicleOperationalStatus =
  | "available"
  | "leased"
  | "workshop"
  | "sold"
  | "retired";

export type AssetRegisterVehicleDemandFilter =
  | "any"
  | "in_demand"
  | "no_demand";

export type AssetRegisterVehicleAssignmentSummary = {
  openDemandUnits: number;
  openDemandContractCount: number;
};

export type AssetRegisterVehicleListItem = {
  id: string;
  fleetCode: string;
  registrationNumber: string;
  assetClassId: string;
  assetClassName: string;
  chassisNumber: string;
  modelYear: number;
  odometer: number;
  addedToRegisterDate: string;
  openDemandUnitsToAssign: number;
  openDemandContractCount: number;
  operationalStatus: AssetRegisterVehicleOperationalStatus;
  status: AssetRegisterClassStatus;
};

export type AssetRegisterVehicleDetail = AssetRegisterVehicleListItem & {
  assetClassSpecLabel: string;
  chassisNumber: string;
  modelYear: number;
  registrationStartDate: string;
  registrationEndDate: string;
  insuranceStartDate: string;
  insuranceEndDate: string;
  insurancePremium: string;
  insuranceSupplierId: string | null;
  insuranceSupplierName: string | null;
  warrantyStartDate: string;
  warrantyEndDate: string;
  specialNotes: string | null;
  purchaseInvoiceId: string | null;
  isActive: boolean;
  deactivatedAt: string | null;
  deactivateReason: string | null;
  createdAt: string;
  updatedAt: string;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchAssetRegisterVehiclesApi(
  params: ListSortParams & {
    organizationId: string;
    token: string;
    page?: number;
    pageSize?: number;
    search?: string;
    assetClassId?: string;
    operationalStatus?: AssetRegisterVehicleOperationalStatus;
    status?: AssetRegisterClassStatus;
    demandFilter?: AssetRegisterVehicleDemandFilter;
    includeAssignmentSummary?: boolean;
  },
): Promise<
  PaginatedResponse<AssetRegisterVehicleListItem> & {
    assignmentSummary?: AssetRegisterVehicleAssignmentSummary;
  }
> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.assetClassId) q.set("assetClassId", params.assetClassId);
  if (params.operationalStatus)
    q.set("operationalStatus", params.operationalStatus);
  if (params.status) q.set("status", params.status);
  if (params.demandFilter && params.demandFilter !== "any") {
    q.set("demandFilter", params.demandFilter);
  }
  if (params.includeAssignmentSummary) {
    q.set("includeAssignmentSummary", "true");
  }
  appendListSortSearchParams(q, params);

  return apiFetch<
    PaginatedResponse<AssetRegisterVehicleListItem> & {
      assignmentSummary?: AssetRegisterVehicleAssignmentSummary;
    }
  >(
    `/asset-register/vehicles?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

const ASSET_REGISTER_VEHICLE_CATALOG_PAGE_SIZE = 50;

/** Loads available vehicles for one asset class (oldest register date first). */
export async function fetchAllAssetRegisterVehiclesForClassApi(params: {
  organizationId: string;
  token: string;
  assetClassId: string;
  operationalStatus?: AssetRegisterVehicleOperationalStatus;
  status?: AssetRegisterClassStatus;
  sortBy?: "createdAt";
  sortOrder?: "asc" | "desc";
  maxItems?: number;
}): Promise<AssetRegisterVehicleListItem[]> {
  const maxItems = Math.min(
    params.maxItems ?? ASSET_REGISTER_VEHICLE_CATALOG_PAGE_SIZE,
    ASSET_REGISTER_VEHICLE_CATALOG_PAGE_SIZE,
  );
  const response = await fetchAssetRegisterVehiclesApi({
    organizationId: params.organizationId,
    token: params.token,
    page: 1,
    pageSize: maxItems,
    assetClassId: params.assetClassId,
    operationalStatus: params.operationalStatus ?? "available",
    status: params.status ?? "active",
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder ?? "asc",
  });
  return (response.items ?? []).slice(0, maxItems);
}

/** Loads every page of active fleet vehicles for workshop dropdowns. */
export async function fetchAllActiveAssetRegisterVehiclesApi(params: {
  organizationId: string;
  token: string;
}): Promise<AssetRegisterVehicleListItem[]> {
  return fetchAllPaginatedItems(
    (page, pageSize) =>
      fetchAssetRegisterVehiclesApi({
        ...params,
        page,
        pageSize,
        status: "active",
      }),
    ASSET_REGISTER_VEHICLE_CATALOG_PAGE_SIZE,
  );
}

/** Active vehicles currently available (sale invoice picker). */
export async function fetchAllAvailableActiveAssetRegisterVehiclesApi(params: {
  organizationId: string;
  token: string;
}): Promise<AssetRegisterVehicleListItem[]> {
  return fetchAllPaginatedItems(
    (page, pageSize) =>
      fetchAssetRegisterVehiclesApi({
        ...params,
        page,
        pageSize,
        status: "active",
        operationalStatus: "available",
      }),
    ASSET_REGISTER_VEHICLE_CATALOG_PAGE_SIZE,
  );
}

export type AssetRegisterVehicleLeaseHistoryItem = {
  id: string;
  date: string;
  lessee: string;
  leaseStartDate: string;
  leaseEndDate: string;
  status: "Active" | "Completed" | "Cancelled";
  changedBy: string;
  contractId: string;
  contractNumber: string | null;
};

export async function fetchAssetRegisterVehicleLeaseHistoryApi(params: {
  organizationId: string;
  token: string;
  id: string;
}): Promise<AssetRegisterVehicleLeaseHistoryItem[]> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterVehicleLeaseHistoryItem[]>(
    `/asset-register/vehicles/${params.id}/lease-history?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchAssetRegisterVehicleApi(params: {
  organizationId: string;
  token: string;
  id: string;
}): Promise<AssetRegisterVehicleDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterVehicleDetail>(
    `/asset-register/vehicles/${params.id}?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export type CreateAssetRegisterVehiclePayload = {
  organizationId: string;
  assetClassId: string;
  registrationNumber: string;
  chassisNumber: string;
  modelYear: number;
  odometer: number;
  registrationStartDate: string;
  registrationEndDate: string;
  insuranceStartDate: string;
  insuranceEndDate: string;
  insurancePremium: number;
  warrantyStartDate: string;
  warrantyEndDate: string;
  specialNotes?: string;
  purchaseInvoiceId?: string;
};

export async function createAssetRegisterVehicleApi(params: {
  token: string;
  body: CreateAssetRegisterVehiclePayload;
}): Promise<AssetRegisterVehicleDetail> {
  return apiFetch<AssetRegisterVehicleDetail>("/asset-register/vehicles", {
    method: "POST",
    token: params.token,
    headers: orgHeaders(params.body.organizationId),
    body: JSON.stringify(params.body),
  });
}

export async function updateAssetRegisterVehicleApi(params: {
  organizationId: string;
  token: string;
  id: string;
  body: Partial<
    Omit<
      CreateAssetRegisterVehiclePayload,
      "organizationId" | "assetClassId" | "purchaseInvoiceId"
    >
  > & {
    /** `null` clears a linked finance purchase invoice. Omit keeps the current link. */
    purchaseInvoiceId?: string | null;
    /** `null` clears the insurance supplier. Omit keeps the current supplier. */
    insuranceSupplierId?: string | null;
  };
}): Promise<AssetRegisterVehicleDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterVehicleDetail>(
    `/asset-register/vehicles/${params.id}?${q.toString()}`,
    {
      method: "PATCH",
      token: params.token,
      headers: orgHeaders(params.organizationId),
      body: serializeOrgScopedPatchBody(params.body),
    },
  );
}

export async function updateAssetRegisterVehicleStatusApi(params: {
  organizationId: string;
  token: string;
  id: string;
  action: "activate" | "deactivate";
  reason?: string;
}): Promise<AssetRegisterVehicleDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterVehicleDetail>(
    `/asset-register/vehicles/${params.id}/status?${q.toString()}`,
    {
      method: "PATCH",
      token: params.token,
      headers: orgHeaders(params.organizationId),
      body: JSON.stringify({
        action: params.action,
        reason: params.reason,
      }),
    },
  );
}
