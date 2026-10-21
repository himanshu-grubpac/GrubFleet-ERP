import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const LEASE_CONTRACT_LIST_SORT_FIELDS = [
  'createdAt',
  'contractNumber',
  'status',
  'startDate',
  'endDate',
] as const;
export type LeaseContractListSortField =
  (typeof LEASE_CONTRACT_LIST_SORT_FIELDS)[number];
export const LEASE_CONTRACT_LIST_DEFAULT_SORT: ResolvedListSort<LeaseContractListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const FLEET_CLIENT_LIST_SORT_FIELDS = [
  'companyName',
  'createdAt',
  'updatedAt',
] as const;
export type FleetClientListSortField =
  (typeof FLEET_CLIENT_LIST_SORT_FIELDS)[number];
export const FLEET_CLIENT_LIST_DEFAULT_SORT: ResolvedListSort<FleetClientListSortField> =
  { sortBy: 'companyName', sortOrder: 'asc' };

export const FLEET_VEHICLE_LIST_SORT_FIELDS = [
  'registrationNo',
  'assetClass',
  'createdAt',
] as const;
export type FleetVehicleListSortField =
  (typeof FLEET_VEHICLE_LIST_SORT_FIELDS)[number];
export const FLEET_VEHICLE_LIST_DEFAULT_SORT: ResolvedListSort<FleetVehicleListSortField> =
  { sortBy: 'registrationNo', sortOrder: 'asc' };

export const VEHICLE_ALLOCATION_LIST_SORT_FIELDS = ['createdAt', 'status'] as const;
export type VehicleAllocationListSortField =
  (typeof VEHICLE_ALLOCATION_LIST_SORT_FIELDS)[number];
export const VEHICLE_ALLOCATION_LIST_DEFAULT_SORT: ResolvedListSort<VehicleAllocationListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const FLEET_RETURN_LIST_SORT_FIELDS = ['createdAt', 'status'] as const;
export type FleetReturnListSortField =
  (typeof FLEET_RETURN_LIST_SORT_FIELDS)[number];
export const FLEET_RETURN_LIST_DEFAULT_SORT: ResolvedListSort<FleetReturnListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const FLEET_ASSET_CLASS_LIST_SORT_FIELDS = [
  'assetClass',
  'registrationNo',
] as const;
export type FleetAssetClassListSortField =
  (typeof FLEET_ASSET_CLASS_LIST_SORT_FIELDS)[number];
export const FLEET_ASSET_CLASS_LIST_DEFAULT_SORT: ResolvedListSort<FleetAssetClassListSortField> =
  { sortBy: 'assetClass', sortOrder: 'asc' };

export const RENEWALS_EXTENSION_LIST_SORT_FIELDS = [
  'createdAt',
  'contractNumber',
] as const;
export type RenewalsExtensionListSortField =
  (typeof RENEWALS_EXTENSION_LIST_SORT_FIELDS)[number];
export const RENEWALS_EXTENSION_LIST_DEFAULT_SORT: ResolvedListSort<RenewalsExtensionListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const REPLACEMENT_CANDIDATE_LIST_SORT_FIELDS = [
  'registrationNo',
  'assetClass',
] as const;
export type ReplacementCandidateListSortField =
  (typeof REPLACEMENT_CANDIDATE_LIST_SORT_FIELDS)[number];
export const REPLACEMENT_CANDIDATE_LIST_DEFAULT_SORT: ResolvedListSort<ReplacementCandidateListSortField> =
  { sortBy: 'registrationNo', sortOrder: 'asc' };

export const SUPPORT_PAGINATED_LIST_SORT_FIELDS = ['createdAt'] as const;
export type SupportPaginatedListSortField =
  (typeof SUPPORT_PAGINATED_LIST_SORT_FIELDS)[number];
export const SUPPORT_PAGINATED_LIST_DEFAULT_SORT: ResolvedListSort<SupportPaginatedListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const LEASE_CHANGE_HISTORY_SORT_FIELDS = ['createdAt'] as const;
export type LeaseChangeHistorySortField =
  (typeof LEASE_CHANGE_HISTORY_SORT_FIELDS)[number];
export const LEASE_CHANGE_HISTORY_DEFAULT_SORT: ResolvedListSort<LeaseChangeHistorySortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };
