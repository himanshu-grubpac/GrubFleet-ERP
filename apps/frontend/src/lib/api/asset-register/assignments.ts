import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";
import {
  DEFAULT_API_CATALOG_PAGE_SIZE,
  fetchAllPaginatedItems,
} from "../fetch-all-paginated";

export type AssignableLeaseContractForVehicle = {
  leaseContractId: string;
  contractNumber: string;
  clientName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  organisationClientId: string | null;
  fleetClientId: string | null;
  assetClassName: string;
  committedQuantity: number;
  allocatedCount: number;
  remainingToAssign: number;
  assignable: boolean;
};

export type AssignableLeaseContractsForVehicleResponse =
  PaginatedResponse<AssignableLeaseContractForVehicle> & {
    vehicleId: string;
    assetClassId: string;
    assetClassName: string;
    hiddenOtherActiveCount: number;
    hasMatchingContractLine: boolean;
    hasOpenDemand: boolean;
  };

export type BulkAssignAssetRegisterVehiclesPayload = {
  organizationId: string;
  leaseContractId: string;
  vehicleIds: string[];
  organisationClientId?: string;
  handoverDate?: string;
  odometerAtHandover?: number;
  handoverLocation?: string;
  notes?: string;
};

export type BulkAssignVehicleConflictReason =
  | "assigned_elsewhere"
  | "in_workshop"
  | "inactive"
  | "not_available"
  | "wrong_asset_class";

export type BulkAssignVehicleValidationRow = {
  vehicleId: string;
  fleetCode: string;
  available: boolean;
  reason?: BulkAssignVehicleConflictReason;
  conflictLabel?: string | null;
};

export type BulkAssignValidateResult = {
  leaseContractId: string;
  vehicles: BulkAssignVehicleValidationRow[];
  conflictCount: number;
  replacementAvailableCount: number;
  allAvailable: boolean;
};

export type BulkAssignAssetRegisterVehiclesResult = {
  leaseContractId: string;
  contractId: string;
  contractNumber: string;
  clientName: string;
  assetClassName: string;
  handoverDate: string;
  lineCommitted: number;
  lineAllocatedAfter: number;
  remainingToAssignOnLine: number;
  remainingInPoolForClass: number;
  fullyAssignedLine: boolean;
  fleetCode: string | null;
  assignedCount: number;
  assignments: Array<{
    id: string;
    vehicleId: string;
    leaseContractId: string;
    fleetClientId: string | null;
    organisationClientId: string | null;
    assignedAt: string;
  }>;
};

export type BulkAssignConflictErrorDetails = {
  vehicles: BulkAssignVehicleValidationRow[];
  conflictCount: number;
  replacementAvailableCount: number;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export type BulkAssignCatalogClient = {
  organisationClientId: string;
  clientName: string;
  activeContractCount: number;
  openAssetClassLineCount: number;
};

export type BulkAssignCatalogLine = {
  lineId: string;
  assetClassId: string | null;
  assetClassName: string;
  committedQuantity: number;
  allocatedCount: number;
  remainingToAssign: number;
  availableNow: number;
  lineStatus: "enough" | "short" | "fully_assigned";
  shortBy: number;
  selectable: boolean;
};

export type BulkAssignCatalogContract = {
  leaseContractId: string;
  contractNumber: string;
  clientName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  organisationClientId: string | null;
  fleetClientId: string | null;
  lineCount: number;
  unitsStillToAssign: number;
  assetLines: BulkAssignCatalogLine[];
};

export type BulkAssignCatalogResponse = {
  clients: BulkAssignCatalogClient[];
  selectedClient?: BulkAssignCatalogClient | null;
  contracts?: BulkAssignCatalogContract[];
};

export async function fetchBulkAssignCatalogApi(params: {
  token: string;
  organizationId: string;
  organisationClientId?: string;
}): Promise<BulkAssignCatalogResponse> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
  });
  if (params.organisationClientId) {
    query.set("organisationClientId", params.organisationClientId);
  }
  return apiFetch<BulkAssignCatalogResponse>(
    `/asset-register/vehicle-assignments/bulk-assign/catalog?${query.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchAssignableLeaseContractsForVehicleApi(params: {
  token: string;
  organizationId: string;
  vehicleId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  organisationClientId?: string;
}): Promise<AssignableLeaseContractsForVehicleResponse> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    vehicleId: params.vehicleId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.organisationClientId) {
    query.set("organisationClientId", params.organisationClientId);
  }
  return apiFetch<AssignableLeaseContractsForVehicleResponse>(
    `/asset-register/vehicle-assignments/assignable-lease-contracts?${query.toString()}`,
    {
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

/** Walks page size 50 until every assignable contract for the vehicle is loaded. */
export async function fetchAllAssignableLeaseContractsForVehicleApi(
  params: Omit<
    Parameters<typeof fetchAssignableLeaseContractsForVehicleApi>[0],
    "page" | "pageSize"
  >,
): Promise<AssignableLeaseContractsForVehicleResponse> {
  let firstPage: AssignableLeaseContractsForVehicleResponse | undefined;
  const items = await fetchAllPaginatedItems(async (page, pageSize) => {
    const response = await fetchAssignableLeaseContractsForVehicleApi({
      ...params,
      page,
      pageSize,
    });
    if (!firstPage) {
      firstPage = response;
    }
    return response;
  }, DEFAULT_API_CATALOG_PAGE_SIZE);

  if (!firstPage) {
    throw new Error("Assignable lease contracts catalog returned no page.");
  }

  return {
    ...firstPage,
    items,
    total: Math.max(firstPage.total, items.length),
    page: 1,
    pageSize: items.length || DEFAULT_API_CATALOG_PAGE_SIZE,
    totalPages: 1,
  };
}

export async function validateBulkAssignAssetRegisterVehiclesApi(params: {
  token: string;
  body: {
    organizationId: string;
    leaseContractId: string;
    vehicleIds: string[];
    assetClassId?: string;
  };
}): Promise<BulkAssignValidateResult> {
  return apiFetch<BulkAssignValidateResult>(
    "/asset-register/vehicle-assignments/bulk-assign/validate",
    {
      method: "POST",
      token: params.token,
      headers: orgHeaders(params.body.organizationId),
      body: JSON.stringify(params.body),
    },
  );
}

export async function bulkAssignAssetRegisterVehiclesApi(params: {
  token: string;
  body: BulkAssignAssetRegisterVehiclesPayload;
}): Promise<BulkAssignAssetRegisterVehiclesResult> {
  return apiFetch<BulkAssignAssetRegisterVehiclesResult>(
    "/asset-register/vehicle-assignments/bulk-assign",
    {
      method: "POST",
      token: params.token,
      headers: orgHeaders(params.body.organizationId),
      body: JSON.stringify(params.body),
    },
  );
}

export function parseBulkAssignConflictDetails(
  details: unknown,
): BulkAssignConflictErrorDetails | null {
  if (details === null || typeof details !== "object") {
    return null;
  }
  const record = details as Record<string, unknown>;
  if (!Array.isArray(record.vehicles)) {
    return null;
  }
  return {
    vehicles: record.vehicles as BulkAssignVehicleValidationRow[],
    conflictCount:
      typeof record.conflictCount === "number" ? record.conflictCount : 0,
    replacementAvailableCount:
      typeof record.replacementAvailableCount === "number"
        ? record.replacementAvailableCount
        : 0,
  };
}

export async function unassignAssetRegisterVehicleApi(params: {
  organizationId: string;
  token: string;
  vehicleId: string;
}): Promise<{
  vehicleId: string;
  assignmentId: string;
  leaseContractId: string;
  unassignedAt: string | null;
  operationalStatus: string;
}> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  return apiFetch(
    `/asset-register/vehicle-assignments/${params.vehicleId}/unassign?${q.toString()}`,
    {
      method: "PATCH",
      token: params.token,
      headers: orgHeaders(params.organizationId),
    },
  );
}
