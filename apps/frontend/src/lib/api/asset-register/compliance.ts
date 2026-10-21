
import type { PaginatedResponse } from "@grubpac/shared-types";
import type { ListSortParams } from "@/lib/query/list-sort-params";
import { appendListSortSearchParams } from "@/lib/query/list-sort-params";
import { parseRupeeInputToMajorNumber } from "@/lib/format/money-format";
import { apiFetch } from "../client";

function insurancePremiumToApiNumber(value: string | number): number {
  return typeof value === "number"
    ? value
    : parseRupeeInputToMajorNumber(value);
}

export type AssetRegisterComplianceFilterStatus =
  | "expired"
  | "expiring_soon"
  | "valid";


export type AssetRegisterComplianceCredential = {
  kind: "insurance" | "registration" | "warranty";
  startDate: string | null;
  endDate: string | null;
  status: AssetRegisterComplianceFilterStatus;
  premium?: string;
};
export type AssetRegisterComplianceListItem = {
  vehicleId: string;
  fleetCode: string;
  registrationNumber: string;
  assetClassName: string;
  overallComplianceStatus: AssetRegisterComplianceFilterStatus;

  insurance: AssetRegisterComplianceCredential;
  registration: AssetRegisterComplianceCredential;
  warranty: AssetRegisterComplianceCredential;
};

export type AssetRegisterComplianceDetail =
  AssetRegisterComplianceListItem & {
    registrationStartDate: string;
    insuranceStartDate: string;
    warrantyStartDate: string;
    insurancePremium: string;
  };

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchAssetRegisterComplianceListApi(
  params: ListSortParams & {
    organizationId: string;
    token: string;
    page?: number;
    pageSize?: number;
    search?: string;
    complianceStatus?: AssetRegisterComplianceFilterStatus;
  },
): Promise<PaginatedResponse<AssetRegisterComplianceListItem>> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });

  if (params.search?.trim()) {
    q.set("search", params.search.trim());
  }

  if (params.complianceStatus) {
    q.set("complianceStatus", params.complianceStatus);
  }
  appendListSortSearchParams(q, params);

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
  const q = new URLSearchParams({
    organizationId: params.organizationId,
  });

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
  insurancePremium?: string | number;
}): Promise<AssetRegisterComplianceDetail> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
  });

  return apiFetch<AssetRegisterComplianceDetail>(
    `/asset-register/compliance/${params.vehicleId}/renew?${q.toString()}`,
    {
      method: "POST",
      token: params.token,
      headers: orgHeaders(params.organizationId),
      body: JSON.stringify({
        organizationId: params.organizationId,
        type: params.type,
        startDate: params.startDate,
        endDate: params.endDate,
        ...(params.insurancePremium !== undefined
          ? {
              insurancePremium: insurancePremiumToApiNumber(
                params.insurancePremium,
              ),
            }
          : {}),
      }),
    },
  );
}
