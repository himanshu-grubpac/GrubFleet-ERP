import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const WORK_ORDER_LIST_SORT_FIELDS = [
  'createdAt',
  'workOrderNumber',
  'status',
  'closedAt',
] as const;
export type WorkOrderListSortField =
  (typeof WORK_ORDER_LIST_SORT_FIELDS)[number];
export const WORK_ORDER_LIST_DEFAULT_SORT: ResolvedListSort<WorkOrderListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const LABOR_JOB_CARD_LIST_SORT_FIELDS = [
  'createdAt',
  'jobCardNumber',
  'status',
] as const;
export type LaborJobCardListSortField =
  (typeof LABOR_JOB_CARD_LIST_SORT_FIELDS)[number];
export const LABOR_JOB_CARD_LIST_DEFAULT_SORT: ResolvedListSort<LaborJobCardListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const AMC_TIER_LIST_SORT_FIELDS = ['name', 'createdAt'] as const;
export type AmcTierListSortField = (typeof AMC_TIER_LIST_SORT_FIELDS)[number];
export const AMC_TIER_LIST_DEFAULT_SORT: ResolvedListSort<AmcTierListSortField> =
  { sortBy: 'name', sortOrder: 'asc' };

export const MAINTENANCE_SCHEDULE_LIST_SORT_FIELDS = [
  'name',
  'createdAt',
] as const;
export type MaintenanceScheduleListSortField =
  (typeof MAINTENANCE_SCHEDULE_LIST_SORT_FIELDS)[number];
export const MAINTENANCE_SCHEDULE_LIST_DEFAULT_SORT: ResolvedListSort<MaintenanceScheduleListSortField> =
  { sortBy: 'name', sortOrder: 'asc' };

export const AMC_SUBSCRIBER_LIST_SORT_FIELDS = [
  'subscriberCode',
  'createdAt',
] as const;
export type AmcSubscriberListSortField =
  (typeof AMC_SUBSCRIBER_LIST_SORT_FIELDS)[number];
export const AMC_SUBSCRIBER_LIST_DEFAULT_SORT: ResolvedListSort<AmcSubscriberListSortField> =
  { sortBy: 'subscriberCode', sortOrder: 'asc' };

export const WORKSHOP_TECHNICIAN_LIST_SORT_FIELDS = [
  'fullName',
  'openWorkOrderCount',
] as const;
export type WorkshopTechnicianListSortField =
  (typeof WORKSHOP_TECHNICIAN_LIST_SORT_FIELDS)[number];
export const WORKSHOP_TECHNICIAN_LIST_DEFAULT_SORT: ResolvedListSort<WorkshopTechnicianListSortField> =
  { sortBy: 'fullName', sortOrder: 'asc' };

export const MAINTENANCE_SCHEDULE_VEHICLE_LIST_SORT_FIELDS = [
  'fleetCode',
  'registrationNumber',
] as const;
export type MaintenanceScheduleVehicleListSortField =
  (typeof MAINTENANCE_SCHEDULE_VEHICLE_LIST_SORT_FIELDS)[number];
export const MAINTENANCE_SCHEDULE_VEHICLE_LIST_DEFAULT_SORT: ResolvedListSort<MaintenanceScheduleVehicleListSortField> =
  { sortBy: 'fleetCode', sortOrder: 'asc' };
