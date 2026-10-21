import type { ResolvedListSort } from '../../../common/utils/list-sort.util';

export const AUDIT_LIST_SORT_FIELDS = [
  'createdAt',
  'action',
  'resourceType',
] as const;
export type AuditListSortField = (typeof AUDIT_LIST_SORT_FIELDS)[number];
export const AUDIT_LIST_DEFAULT_SORT: ResolvedListSort<AuditListSortField> = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
};
