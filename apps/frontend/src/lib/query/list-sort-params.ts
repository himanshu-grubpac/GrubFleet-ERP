/** Optional server-side list sort query params (pass through to list APIs). */
export type ListSortParams = {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export function appendListSortSearchParams(
  searchParams: URLSearchParams,
  sort?: ListSortParams,
): void {
  if (sort?.sortBy) {
    searchParams.set('sortBy', sort.sortBy);
  }
  if (sort?.sortOrder) {
    searchParams.set('sortOrder', sort.sortOrder);
  }
}
