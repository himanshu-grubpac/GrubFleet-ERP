import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const ROLE_LIST_SORT_FIELDS = [
  'name',
  'createdAt',
  'updatedAt',
] as const;
export type RoleListSortField = (typeof ROLE_LIST_SORT_FIELDS)[number];
export const ROLE_LIST_DEFAULT_SORT: ResolvedListSort<RoleListSortField> = {
  sortBy: 'name',
  sortOrder: 'asc',
};
