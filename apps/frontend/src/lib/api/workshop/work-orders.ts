import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";
import type { ListSortParams } from "@/lib/query/list-sort-params";
import { appendListSortSearchParams } from "@/lib/query/list-sort-params";

export type WorkshopWorkOrderStatus =
  | "open"
  | "in_progress"
  | "closed"
  | "cancelled";

export type WorkshopWorkOrderListItem = {
  id: string;
  workOrderNumber: string;
  status: WorkshopWorkOrderStatus;
  vehicleFleetCode: string | null;
  vehicleAssetClassName: string | null;
  technicianName: string | null;
  expectedCompletionDate: string | null;
  netTotalMinor: number;
  createdAt: string;
};

export type WorkshopWorkOrderVehicleSnapshot = {
  id: string;
  fleetCode: string;
  registrationNumber: string;
  assetClassName: string;
  odometer: number;
};

export type WorkshopWorkOrderPartFulfillmentStatus =
  | "reserved"
  | "issued"
  | "cancelled";

export type WorkshopWorkOrderPartLine = {
  id: string;
  partId: string;
  partName: string;
  partCode: string | null;
  quantity: number;
  unitCostMinor: number;
  lineTotalMinor: number;
  lineSource: "template" | "additional";
  fulfillmentStatus?: WorkshopWorkOrderPartFulfillmentStatus;
};

export type WorkshopWorkOrderAvailableActions = {
  edit: boolean;
  start: boolean;
  complete: boolean;
};

export type WorkshopWorkOrderPartsFulfillmentSummary =
  | "none"
  | "reserved"
  | "issued"
  | "mixed";

export type WorkshopWorkOrderLaborLine = {
  id: string;
  description: string;
  amountMinor: number;
  lineSource: "template" | "additional";
};

export type WorkshopWorkOrderType = "general" | "pm" | "return_inspection";

export type WorkshopWorkOrderSource =
  | "manual"
  | "maintenance_schedule"
  | "lease_return";

export type WorkshopWorkOrderStatusBanner = {
  level: "info" | "warning" | "success";
  message: string;
};

export type WorkshopWorkOrderDetail = {
  id: string;
  workOrderNumber: string;
  status: WorkshopWorkOrderStatus;
  workOrderType?: WorkshopWorkOrderType;
  workOrderSource?: WorkshopWorkOrderSource;
  maintenanceScheduleId?: string | null;
  maintenanceScheduleName?: string | null;
  sourceLabel?: string;
  partsFulfillmentSummary?: WorkshopWorkOrderPartsFulfillmentSummary;
  statusBanner?: WorkshopWorkOrderStatusBanner | null;
  availableActions?: WorkshopWorkOrderAvailableActions;
  vehicle: WorkshopWorkOrderVehicleSnapshot | null;
  laborJobCardId: string | null;
  technicianEmployeeId: string | null;
  technicianName: string | null;
  expectedCompletionDate: string | null;
  reportedBy: string | null;
  odometerReading: number | null;
  issueDescription: string | null;
  notes: string | null;
  partsTotalMinor: number;
  laborTotalMinor: number;
  netTotalMinor: number;
  partLines: WorkshopWorkOrderPartLine[];
  laborLines: WorkshopWorkOrderLaborLine[];
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
};

export type ListWorkshopWorkOrdersParams = ListSortParams & {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WorkshopWorkOrderStatus;
};

export type CreateWorkshopWorkOrderPayload = {
  organizationId: string;
  vehicleId: string;
  laborJobCardId?: string;
  technicianEmployeeId?: string;
  expectedCompletionDate?: string;
  reportedBy?: string;
  odometerReading?: number;
  issueDescription?: string;
  notes?: string;
  additionalParts?: Array<{
    partId: string;
    quantity: number;
    unitCostMinor?: number;
  }>;
  additionalLabor?: Array<{ description: string; amountMinor: number }>;
};

export type UpdateWorkshopWorkOrderPayload = {
  organizationId: string;
  technicianEmployeeId?: string | null;
  expectedCompletionDate?: string | null;
  reportedBy?: string | null;
  odometerReading?: number | null;
  issueDescription?: string | null;
  notes?: string | null;
  additionalParts?: Array<{
    partId: string;
    quantity: number;
    unitCostMinor?: number;
  }>;
  additionalLabor?: Array<{ description: string; amountMinor: number }>;
};

export type UpdateWorkshopWorkOrderStatusPayload = {
  organizationId: string;
  action: "start" | "close" | "cancel";
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchWorkshopWorkOrdersApi(
  token: string,
  params: ListWorkshopWorkOrdersParams,
): Promise<PaginatedResponse<WorkshopWorkOrderListItem>> {
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
  appendListSortSearchParams(query, params);
  return apiFetch<PaginatedResponse<WorkshopWorkOrderListItem>>(
    `/workshop/work-orders?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchWorkshopWorkOrderApi(
  token: string,
  organizationId: string,
  id: string,
): Promise<WorkshopWorkOrderDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<WorkshopWorkOrderDetail>(
    `/workshop/work-orders/${encodeURIComponent(id)}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createWorkshopWorkOrderApi(
  token: string,
  payload: CreateWorkshopWorkOrderPayload,
): Promise<WorkshopWorkOrderDetail> {
  return apiFetch<WorkshopWorkOrderDetail>("/workshop/work-orders", {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}

export async function updateWorkshopWorkOrderApi(
  token: string,
  workOrderId: string,
  payload: UpdateWorkshopWorkOrderPayload,
): Promise<WorkshopWorkOrderDetail> {
  const query = new URLSearchParams({
    organizationId: payload.organizationId,
  });
  return apiFetch<WorkshopWorkOrderDetail>(
    `/workshop/work-orders/${encodeURIComponent(workOrderId)}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(payload.organizationId),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateWorkshopWorkOrderStatusApi(
  token: string,
  workOrderId: string,
  payload: UpdateWorkshopWorkOrderStatusPayload,
): Promise<WorkshopWorkOrderDetail> {
  const query = new URLSearchParams({
    organizationId: payload.organizationId,
  });
  return apiFetch<WorkshopWorkOrderDetail>(
    `/workshop/work-orders/${encodeURIComponent(workOrderId)}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(payload.organizationId),
      body: JSON.stringify({ action: payload.action }),
    },
  );
}
