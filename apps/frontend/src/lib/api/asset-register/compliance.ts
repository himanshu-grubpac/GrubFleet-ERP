import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";

export type AssetRegisterComplianceFilterStatus =
  | "expired"
  | "expiring_soon"
  | "valid";

export type AssetRegisterComplianceListItem = {
  vehicleId: string;
  fleetCode: string;
  registrationNumber: string;
  assetClassName: string;
  operationalStatus: string;
  complianceStatus: AssetRegisterComplianceFilterStatus;
  registrationEndDate: string;
  insuranceEndDate: string;
  warrantyEndDate: string;
};

export type AssetRegisterComplianceDetail = AssetRegisterComplianceListItem & {
  assetMasterName: string;
  registrationStartDate: string;
  insuranceStartDate: string;
  warrantyStartDate: string;
  insurancePremium: string;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchAssetRegisterComplianceListApi(params: {
  organizationId: string;
  token: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AssetRegisterComplianceFilterStatus;
}): Promise<PaginatedResponse<AssetRegisterComplianceListItem>> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.status) q.set("status", params.status);

  return apiFetch<PaginatedResponse<AssetRegisterComplianceListItem>>(
    `/asset-register/compliance?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchAssetRegisterComplianceDetailApi(params: {
  organizationId: string;
  token: string;
  vehicleId: string;
}): Promise<AssetRegisterComplianceDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterComplianceDetail>(
    `/asset-register/compliance/${params.vehicleId}?${q.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function renewAssetRegisterComplianceApi(params: {
  organizationId: string;
  token: string;
  vehicleId: string;
  type: "insurance" | "registration" | "warranty";
  startDate: string;
  endDate: string;
  insurancePremium?: number;
}): Promise<AssetRegisterComplianceDetail> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch<AssetRegisterComplianceDetail>(
    `/asset-register/compliance/${params.vehicleId}/renew?${q.toString()}`,
    {
      method: "POST",
      token: params.token,
      headers: orgHeaders(params.organizationId),
      body: JSON.stringify({
        type: params.type,
        startDate: params.startDate,
        endDate: params.endDate,
        insurancePremium: params.insurancePremium,
      }),
    },
  );
}
