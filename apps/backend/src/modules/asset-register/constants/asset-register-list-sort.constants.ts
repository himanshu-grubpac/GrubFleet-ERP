import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const ASSET_CLASS_LIST_SORT_FIELDS = [
  'classId',
  'createdAt',
  'name',
  'brand',
  'modelName',
  'updatedAt',
] as const;
export type AssetClassListSortField =
  (typeof ASSET_CLASS_LIST_SORT_FIELDS)[number];
export const ASSET_CLASS_LIST_DEFAULT_SORT: ResolvedListSort<AssetClassListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const ASSET_REGISTER_VEHICLE_LIST_SORT_FIELDS = [
  'createdAt',
  'fleetCode',
  'registrationNumber',
  'operationalStatus',
  'updatedAt',
] as const;
export type AssetRegisterVehicleListSortField =
  (typeof ASSET_REGISTER_VEHICLE_LIST_SORT_FIELDS)[number];
export const ASSET_REGISTER_VEHICLE_LIST_DEFAULT_SORT: ResolvedListSort<AssetRegisterVehicleListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const ASSET_COMPLIANCE_LIST_SORT_FIELDS = [
  'registrationNumber',
  'fleetCode',
  'complianceDueDate',
] as const;
export type AssetComplianceListSortField =
  (typeof ASSET_COMPLIANCE_LIST_SORT_FIELDS)[number];
export const ASSET_COMPLIANCE_LIST_DEFAULT_SORT: ResolvedListSort<AssetComplianceListSortField> =
  { sortBy: 'registrationNumber', sortOrder: 'asc' };
