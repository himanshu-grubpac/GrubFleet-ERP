import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";
import type { AssetRegisterClassStatus } from "./asset-classes";

export type AssetRegisterAssetMasterListItem = {
  id: string;
  name: string;
  assetClassId: string;
  assetClassName: string;
  assetClassCode: string;
  status: AssetRegisterClassStatus;
};

export type AssetRegisterAssetMasterDetail = AssetRegisterAssetMasterListItem & {
  classSpec: {
    vehicleType: string;
    fuelType: string;
    mileageFrom: string | null;
    mileageTo: string | null;
    mileageUnit: string | null;
    fuelTankCapacity: string;
    ratedLoadFrom: string;
    ratedLoadTo: string;
  };
  isActive: boolean;
  deactivatedAt: string | null;
  deactivateReason: string | null;
  createdAt: string;
  updatedAt: string;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchAssetRegisterAssetMastersApi(params: {
  organizationId: string;
  token: string;
  page?: number;
  pageSize?: number;
  search?: string;
  assetClassId?: string;
  status?: AssetRegisterClassStatus;
}): Promise<PaginatedResponse<AssetRegisterAssetMasterListItem>> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.assetClassId) q.set("assetClassId", params.assetClassId);
  if (params.status) q.set("status", params.status);

  return apiFetch<PaginatedResponse<AssetRegisterAssetMasterListItem>>(
    `/asset-register/asset-masters?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchAssetRegisterMastersForClassApi(params: {
  organizationId: string;
  token: string;
  classId: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<AssetRegisterAssetMasterListItem>> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  return apiFetch<PaginatedResponse<AssetRegisterAssetMasterListItem>>(
    `/asset-register/asset-classes/${params.classId}/masters?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchAssetRegisterAssetMasterApi(params: {
  organizationId: string;
  token: string;
  id: string;
}): Promise<AssetRegisterAssetMasterDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterAssetMasterDetail>(
    `/asset-register/asset-masters/${params.id}?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function createAssetRegisterAssetMasterApi(params: {
  token: string;
  organizationId: string;
  assetClassId: string;
  name: string;
}): Promise<AssetRegisterAssetMasterDetail> {
  return apiFetch<AssetRegisterAssetMasterDetail>(
    "/asset-register/asset-masters",
    {
      method: "POST",
      token: params.token,
      headers: orgHeaders(params.organizationId),
      body: JSON.stringify({
        organizationId: params.organizationId,
        assetClassId: params.assetClassId,
        name: params.name,
      }),
    },
  );
}

export async function updateAssetRegisterAssetMasterApi(params: {
  organizationId: string;
  token: string;
  id: string;
  name: string;
}): Promise<AssetRegisterAssetMasterDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterAssetMasterDetail>(
    `/asset-register/asset-masters/${params.id}?${q.toString()}`,
    {
      method: "PATCH",
      token: params.token,
      headers: orgHeaders(params.organizationId),
      body: JSON.stringify({ name: params.name }),
    },
  );
}

export async function updateAssetRegisterAssetMasterStatusApi(params: {
  organizationId: string;
  token: string;
  id: string;
  action: "activate" | "deactivate";
  reason?: string;
}): Promise<AssetRegisterAssetMasterDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterAssetMasterDetail>(
    `/asset-register/asset-masters/${params.id}/status?${q.toString()}`,
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
