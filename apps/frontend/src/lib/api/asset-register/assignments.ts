import { apiFetch } from "../client";

export type BulkAssignAssetRegisterVehiclesPayload = {
  organizationId: string;
  leaseContractId: string;
  vehicleIds: string[];
  organisationClientId?: string;
};

export type BulkAssignAssetRegisterVehiclesResult = {
  leaseContractId: string;
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

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
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
