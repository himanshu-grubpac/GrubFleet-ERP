import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const ORGANIZATION_LIST_SORT_FIELDS = ['name', 'createdAt'] as const;
export type OrganizationListSortField =
  (typeof ORGANIZATION_LIST_SORT_FIELDS)[number];
export const ORGANIZATION_LIST_DEFAULT_SORT: ResolvedListSort<OrganizationListSortField> =
  { sortBy: 'name', sortOrder: 'asc' };
