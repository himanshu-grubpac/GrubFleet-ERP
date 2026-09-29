/**
 * Shared visibility rules for dashboard list search + filters.
 * Prevents filter bar unmount (focus loss) when input clears before debounce/API catch up.
 */

export function isDashboardSearchSettled(
  searchInput: string,
  debouncedSearch: string,
): boolean {
  return searchInput.trim() === debouncedSearch.trim();
}

/** Keep filter row mounted while search debounces or placeholder fetch runs after clear. */
export function shouldShowDashboardListFilters(options: {
  total: number;
  searchInput: string;
  debouncedSearch: string;
  hasActiveSelectFilters: boolean;
  isFetchingWithPlaceholder?: boolean;
}): boolean {
  const {
    total,
    searchInput,
    debouncedSearch,
    hasActiveSelectFilters,
    isFetchingWithPlaceholder,
  } = options;

  return (
    total > 0 ||
    searchInput.trim() !== "" ||
    debouncedSearch.trim() !== "" ||
    hasActiveSelectFilters ||
    Boolean(isFetchingWithPlaceholder)
  );
}

/** Org/catalog empty state — not "no results" — avoid flash while refetching after clear. */
export function isDashboardCatalogEmptyState(options: {
  total: number;
  searchInput: string;
  debouncedSearch: string;
  hasActiveFilters: boolean;
  isFetching: boolean;
}): boolean {
  const {
    total,
    searchInput,
    debouncedSearch,
    hasActiveFilters,
    isFetching,
  } = options;

  if (hasActiveFilters || isFetching) {
    return false;
  }

  if (!isDashboardSearchSettled(searchInput, debouncedSearch)) {
    return false;
  }

  return total === 0 && debouncedSearch.trim() === "";
}
