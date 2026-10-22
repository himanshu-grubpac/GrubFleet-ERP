import type { PaginatedResponse } from "@grubpac/shared-types";
import type { ListSortParams } from "@/lib/query/list-sort-params";
import { appendListSortSearchParams } from "@/lib/query/list-sort-params";
import { apiFetch } from "../client";
import { serializeOrgScopedPatchBody } from "../omit-org-context-from-write-body";

export type WorkshopAmcTierListItem = {
  id: string;
  name: string;
  description: string | null;
  priceDisplayLabel: string | null;
  subscriberCount: number;
  status: "active" | "inactive";
};

export type WorkshopMaintenanceScheduleListItem = {
  id: string;
  name: string;
  assetClassLabel: string | null;
  intervalLabel: string | null;
  maintenanceType: string | null;
  intervalType: string | null;
  vehicleApplicability: string | null;
  description: string | null;
  vehicleCount: number;
  thresholdReachedCount: number;
  status: "active" | "inactive";
};

export type WorkshopAmcSubscriberListItem = {
  id: string;
  subscriberCode: string;
  amcTierId: string;
  tierName: string;
  vehicleId: string;
  fleetCode: string;
  registrationNumber: string;
  assetClassName: string;
  startedAt: string | null;
};

export type WorkshopAmcSubscriberDetail = {
  id: string;
  subscriberCode: string;
  amcTierId: string;
  tierName: string;
  tierDescription: string | null;
  priceDisplayLabel: string | null;
  vehicleId: string;
  fleetCode: string;
  registrationNumber: string;
  assetClassName: string;
  startedAt: string | null;
  endedAt: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

function orgHeaders(organizationId: string): HeadersInit {
  return { "x-organization-id": organizationId };
}

export async function fetchWorkshopAmcTiersApi(
  token: string,
  organizationId: string,
  page = 1,
  pageSize = 50,
  sort?: ListSortParams,
): Promise<PaginatedResponse<WorkshopAmcTierListItem>> {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    pageSize: String(pageSize),
  });
  appendListSortSearchParams(query, sort);
  return apiFetch<PaginatedResponse<WorkshopAmcTierListItem>>(
    `/workshop/amc/tiers?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function fetchWorkshopMaintenanceSchedulesApi(
  token: string,
  organizationId: string,
  page = 1,
  pageSize = 50,
  sort?: ListSortParams,
): Promise<PaginatedResponse<WorkshopMaintenanceScheduleListItem>> {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    pageSize: String(pageSize),
  });
  appendListSortSearchParams(query, sort);
  return apiFetch<PaginatedResponse<WorkshopMaintenanceScheduleListItem>>(
    `/workshop/amc/schedules?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export type WorkshopAmcTierDetail = WorkshopAmcTierListItem & {
  createdAt: string;
  updatedAt: string;
};

export type WorkshopMaintenanceScheduleDetail =
  WorkshopMaintenanceScheduleListItem & {
    createdAt: string;
    updatedAt: string;
  };

export async function fetchWorkshopAmcTierApi(
  token: string,
  organizationId: string,
  id: string,
): Promise<WorkshopAmcTierDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<WorkshopAmcTierDetail>(
    `/workshop/amc/tiers/${encodeURIComponent(id)}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export type WorkshopMaintenanceScheduleVehicleRow = {
  vehicleId: string;
  fleetCode: string;
  assetClassName: string;
  odometer: number;
  thresholdStatus: "threshold_reached" | "on_schedule";
  pmWorkOrderId: string | null;
};

export async function fetchWorkshopMaintenanceScheduleVehiclesApi(
  token: string,
  organizationId: string,
  scheduleId: string,
  page = 1,
  pageSize = 50,
  sort?: ListSortParams,
): Promise<PaginatedResponse<WorkshopMaintenanceScheduleVehicleRow>> {
  const query = new URLSearchParams({
    organizationId,
    page: String(page),
    pageSize: String(pageSize),
  });
  appendListSortSearchParams(query, sort);
  return apiFetch<PaginatedResponse<WorkshopMaintenanceScheduleVehicleRow>>(
    `/workshop/amc/schedules/${encodeURIComponent(scheduleId)}/vehicles?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function fetchWorkshopMaintenanceScheduleApi(
  token: string,
  organizationId: string,
  id: string,
): Promise<WorkshopMaintenanceScheduleDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<WorkshopMaintenanceScheduleDetail>(
    `/workshop/amc/schedules/${encodeURIComponent(id)}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createWorkshopAmcTierApi(
  token: string,
  payload: {
    organizationId: string;
    name: string;
    description?: string;
    priceDisplayLabel?: string;
  },
): Promise<WorkshopAmcTierDetail> {
  return apiFetch<WorkshopAmcTierDetail>("/workshop/amc/tiers", {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}

export async function fetchWorkshopAmcSubscribersApi(
  token: string,
  params: ListSortParams & {
    organizationId: string;
    amcTierId?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<PaginatedResponse<WorkshopAmcSubscriberListItem>> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  });
  if (params.amcTierId) query.set("amcTierId", params.amcTierId);
  appendListSortSearchParams(query, params);
  return apiFetch<PaginatedResponse<WorkshopAmcSubscriberListItem>>(
    `/workshop/amc/subscribers?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(params.organizationId),
    },
  );
}

export async function fetchWorkshopAmcSubscriberByCodeApi(
  token: string,
  organizationId: string,
  subscriberCode: string,
): Promise<WorkshopAmcSubscriberDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<WorkshopAmcSubscriberDetail>(
    `/workshop/amc/subscribers/by-code/${encodeURIComponent(subscriberCode)}?${query.toString()}`,
    {
      method: "GET",
      token,
      headers: orgHeaders(organizationId),
    },
  );
}

export async function createWorkshopMaintenanceScheduleApi(
  token: string,
  payload: {
    organizationId: string;
    name: string;
    assetClassLabel?: string;
    intervalLabel?: string;
    maintenanceType?: string;
    intervalType?: string;
    vehicleApplicability?: string;
    description?: string;
  },
): Promise<WorkshopMaintenanceScheduleDetail> {
  return apiFetch<WorkshopMaintenanceScheduleDetail>(
    "/workshop/amc/schedules",
    {
      method: "POST",
      token,
      headers: orgHeaders(payload.organizationId),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateWorkshopMaintenanceScheduleApi(
  token: string,
  id: string,
  payload: {
    organizationId: string;
    name?: string;
    assetClassLabel?: string | null;
    intervalLabel?: string | null;
    maintenanceType?: string | null;
    intervalType?: string | null;
    vehicleApplicability?: string | null;
    description?: string | null;
  },
): Promise<WorkshopMaintenanceScheduleDetail> {
  const query = new URLSearchParams({ organizationId: payload.organizationId });
  return apiFetch<WorkshopMaintenanceScheduleDetail>(
    `/workshop/amc/schedules/${encodeURIComponent(id)}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(payload.organizationId),
      body: serializeOrgScopedPatchBody(payload),
    },
  );
}

export async function updateWorkshopAmcTierApi(
  token: string,
  id: string,
  payload: {
    organizationId: string;
    name?: string;
    description?: string | null;
    priceDisplayLabel?: string | null;
  },
): Promise<WorkshopAmcTierDetail> {
  const query = new URLSearchParams({ organizationId: payload.organizationId });
  return apiFetch<WorkshopAmcTierDetail>(
    `/workshop/amc/tiers/${encodeURIComponent(id)}?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(payload.organizationId),
      body: serializeOrgScopedPatchBody(payload),
    },
  );
}

export async function updateWorkshopAmcTierStatusApi(
  token: string,
  id: string,
  organizationId: string,
  action: "activate" | "deactivate",
  reason?: string,
): Promise<WorkshopAmcTierDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<WorkshopAmcTierDetail>(
    `/workshop/amc/tiers/${encodeURIComponent(id)}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ action, reason }),
    },
  );
}

export async function updateWorkshopMaintenanceScheduleStatusApi(
  token: string,
  id: string,
  organizationId: string,
  action: "activate" | "deactivate",
  reason?: string,
): Promise<WorkshopMaintenanceScheduleDetail> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch<WorkshopMaintenanceScheduleDetail>(
    `/workshop/amc/schedules/${encodeURIComponent(id)}/status?${query.toString()}`,
    {
      method: "PATCH",
      token,
      headers: orgHeaders(organizationId),
      body: JSON.stringify({ action, reason }),
    },
  );
}

export async function createWorkshopAmcSubscriberApi(
  token: string,
  payload: {
    organizationId: string;
    amcTierId: string;
    vehicleId: string;
    startedAt?: string;
  },
): Promise<WorkshopAmcSubscriberDetail> {
  return apiFetch<WorkshopAmcSubscriberDetail>("/workshop/amc/subscribers", {
    method: "POST",
    token,
    headers: orgHeaders(payload.organizationId),
    body: JSON.stringify(payload),
  });
}
