import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const PERMISSION_CATALOG_LIST_SORT_FIELDS = ['module', 'key'] as const;
export type PermissionCatalogListSortField =
  (typeof PERMISSION_CATALOG_LIST_SORT_FIELDS)[number];
export const PERMISSION_CATALOG_LIST_DEFAULT_SORT: ResolvedListSort<PermissionCatalogListSortField> =
  { sortBy: 'module', sortOrder: 'asc' };
