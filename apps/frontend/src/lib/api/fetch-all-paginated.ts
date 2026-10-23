import type { PaginatedResponse } from "@grubpac/shared-types";

/** Matches backend `MAX_PAGE_SIZE` on most list DTOs. */
export const DEFAULT_API_CATALOG_PAGE_SIZE = 50;

/**
 * Fetches every page until all items are loaded (for bounded catalog dropdowns).
 */
export async function fetchAllPaginatedItems<T>(
  fetchPage: (
    page: number,
    pageSize: number,
  ) => Promise<PaginatedResponse<T>>,
  pageSize: number,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  while (true) {
    const response = await fetchPage(page, pageSize);
    const pageItems = response.items ?? [];
    items.push(...pageItems);
    if (pageItems.length === 0) break;

    const effectivePageSize = response.pageSize ?? pageSize;
    const totalPages =
      response.totalPages ??
      (typeof response.total === "number" && response.total >= 0
        ? Math.ceil(response.total / effectivePageSize)
        : null);

    if (totalPages != null) {
      if (page >= totalPages) break;
    } else if (pageItems.length < pageSize) {
      break;
    } else if (
      typeof response.total === "number" &&
      items.length >= response.total
    ) {
      break;
    }
    page += 1;
  }
  return items;
}
