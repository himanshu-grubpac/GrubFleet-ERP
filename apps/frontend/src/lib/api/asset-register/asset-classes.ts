import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";

export type AssetRegisterClassStatus = "active" | "inactive";
export type AssetRegisterVehicleTypeApi = "2W" | "3W" | "4W";

export type AssetRegisterAssetClassListItem = {
  id: string;
  name: string;
  code: string;
  vehicleType: AssetRegisterVehicleTypeApi;
  fuelType: string;
  inFleetCount: number;
  availableCount: number;
  status: AssetRegisterClassStatus;
};

export type AssetRegisterAssetClassDetail = AssetRegisterAssetClassListItem & {
  description: string;
  mileageFrom: string | null;
  mileageTo: string | null;
  mileageUnit: string | null;
  fuelTankCapacity: string;
  ratedLoadFrom: string;
  ratedLoadTo: string;
  defaultIntakeChecklist: string;
  isActive: boolean;
  deactivatedAt: string | null;
  deactivateReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListAssetRegisterAssetClassesParams = {
  organizationId: string;
  token: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AssetRegisterClassStatus;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchAssetRegisterAssetClassesApi(
  params: ListAssetRegisterAssetClassesParams,
): Promise<PaginatedResponse<AssetRegisterAssetClassListItem>> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.status) q.set("status", params.status);

  return apiFetch<PaginatedResponse<AssetRegisterAssetClassListItem>>(
    `/asset-register/asset-classes?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchAssetRegisterAssetClassApi(params: {
  organizationId: string;
  token: string;
  id: string;
}): Promise<AssetRegisterAssetClassDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterAssetClassDetail>(
    `/asset-register/asset-classes/${params.id}?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export type CreateAssetRegisterAssetClassPayload = {
  organizationId: string;
  name: string;
  description?: string;
  vehicleType: AssetRegisterVehicleTypeApi;
  fuelType: string;
  mileageFrom?: number;
  mileageTo?: number;
  mileageUnit?: string;
  fuelTankCapacity: number;
  ratedLoadFrom: number;
  ratedLoadTo: number;
  defaultIntakeChecklist?: string;
};

export async function createAssetRegisterAssetClassApi(params: {
  token: string;
  body: CreateAssetRegisterAssetClassPayload;
}): Promise<AssetRegisterAssetClassDetail> {
  return apiFetch<AssetRegisterAssetClassDetail>(
    "/asset-register/asset-classes",
    {
      method: "POST",
      token: params.token,
      headers: orgHeaders(params.body.organizationId),
      body: JSON.stringify(params.body),
    },
  );
}

export async function updateAssetRegisterAssetClassApi(params: {
  organizationId: string;
  token: string;
  id: string;
  body: Partial<Omit<CreateAssetRegisterAssetClassPayload, "organizationId">>;
}): Promise<AssetRegisterAssetClassDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterAssetClassDetail>(
    `/asset-register/asset-classes/${params.id}?${q.toString()}`,
    {
      method: "PATCH",
      token: params.token,
      headers: orgHeaders(params.organizationId),
      body: JSON.stringify(params.body),
    },
  );
}

export async function updateAssetRegisterAssetClassStatusApi(params: {
  organizationId: string;
  token: string;
  id: string;
  action: "activate" | "deactivate";
  reason?: string;
}): Promise<AssetRegisterAssetClassDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterAssetClassDetail>(
    `/asset-register/asset-classes/${params.id}/status?${q.toString()}`,
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
