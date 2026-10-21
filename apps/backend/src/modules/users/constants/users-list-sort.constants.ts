import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const USER_LIST_SORT_FIELDS = [
  'email',
  'fullName',
  'createdAt',
  'lastLoginAt',
] as const;
export type UserListSortField = (typeof USER_LIST_SORT_FIELDS)[number];
export const USER_LIST_DEFAULT_SORT: ResolvedListSort<UserListSortField> = {
  sortBy: 'email',
  sortOrder: 'asc',
};
