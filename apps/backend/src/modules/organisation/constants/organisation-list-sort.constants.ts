import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const LOCATION_LIST_SORT_FIELDS = [
  'createdAt',
  'name',
  'updatedAt',
] as const;
export type LocationListSortField = (typeof LOCATION_LIST_SORT_FIELDS)[number];
export const LOCATION_LIST_DEFAULT_SORT: ResolvedListSort<LocationListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const EMPLOYEE_LIST_SORT_FIELDS = [
  'createdAt',
  'fullName',
  'employeeCode',
  'department',
  'dateOfJoining',
  'updatedAt',
] as const;
export type EmployeeListSortField = (typeof EMPLOYEE_LIST_SORT_FIELDS)[number];
export const EMPLOYEE_LIST_DEFAULT_SORT: ResolvedListSort<EmployeeListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const SUPPLIER_LIST_SORT_FIELDS = [
  'createdAt',
  'name',
  'supplierType',
  'updatedAt',
] as const;
export type SupplierListSortField = (typeof SUPPLIER_LIST_SORT_FIELDS)[number];
export const SUPPLIER_LIST_DEFAULT_SORT: ResolvedListSort<SupplierListSortField> =
  { sortBy: 'createdAt', sortOrder: 'desc' };

export const CLIENT_LIST_SORT_FIELDS = [
  'createdAt',
  'name',
  'updatedAt',
] as const;
export type ClientListSortField = (typeof CLIENT_LIST_SORT_FIELDS)[number];
export const CLIENT_LIST_DEFAULT_SORT: ResolvedListSort<ClientListSortField> = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const DRIVER_LIST_SORT_FIELDS = [
  'createdAt',
  'name',
  'licenseExpiry',
  'updatedAt',
] as const;
export type DriverListSortField = (typeof DRIVER_LIST_SORT_FIELDS)[number];
export const DRIVER_LIST_DEFAULT_SORT: ResolvedListSort<DriverListSortField> = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const ASSIGNABLE_VEHICLE_LIST_SORT_FIELDS = [
  'registrationNo',
  'assetClass',
] as const;
export type AssignableVehicleListSortField =
  (typeof ASSIGNABLE_VEHICLE_LIST_SORT_FIELDS)[number];
export const ASSIGNABLE_VEHICLE_LIST_DEFAULT_SORT: ResolvedListSort<AssignableVehicleListSortField> =
  { sortBy: 'registrationNo', sortOrder: 'asc' };
