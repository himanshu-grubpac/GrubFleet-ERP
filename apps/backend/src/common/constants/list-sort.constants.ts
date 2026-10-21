export const LIST_SORT_ORDERS = ['asc', 'desc'] as const;
export type ListSortOrder = (typeof LIST_SORT_ORDERS)[number];

export const DEFAULT_LIST_SORT_TIE_BREAKER_ORDER: ListSortOrder = 'desc';
