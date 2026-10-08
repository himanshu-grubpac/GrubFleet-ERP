import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";
import type { AssetRegisterClassStatus } from "./asset-classes";

export type AssetRegisterVehicleOperationalStatus =
  | "available"
  | "leased"
  | "workshop"
  | "sold"
  | "retired";

export type AssetRegisterVehicleListItem = {
  id: string;
  fleetCode: string;
  registrationNumber: string;
  assetClassId: string;
  assetClassName: string;
  odometer: number;
  operationalStatus: AssetRegisterVehicleOperationalStatus;
  status: AssetRegisterClassStatus;
};

export type AssetRegisterVehicleDetail = AssetRegisterVehicleListItem & {
  assetMasterId: string;
  assetMasterName: string;
  assetClassCode: string;
  chassisNumber: string;
  modelYear: number;
  registrationStartDate: string;
  registrationEndDate: string;
  insuranceStartDate: string;
  insuranceEndDate: string;
  insurancePremium: string;
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

export async function fetchAssetRegisterVehiclesApi(params: {
  organizationId: string;
  token: string;
  page?: number;
  pageSize?: number;
  search?: string;
  assetClassId?: string;
  operationalStatus?: AssetRegisterVehicleOperationalStatus;
  status?: AssetRegisterClassStatus;
}): Promise<PaginatedResponse<AssetRegisterVehicleListItem>> {
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

  return apiFetch<PaginatedResponse<AssetRegisterVehicleListItem>>(
    `/asset-register/vehicles?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
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
  assetMasterId: string;
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
    Omit<CreateAssetRegisterVehiclePayload, "organizationId" | "assetClassId">
  >;
}): Promise<AssetRegisterVehicleDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterVehicleDetail>(
    `/asset-register/vehicles/${params.id}?${q.toString()}`,
    {
      method: "PATCH",
      token: params.token,
      headers: orgHeaders(params.organizationId),
      body: JSON.stringify(params.body),
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
