export const DASHBOARD_DEFAULT_PAGE_SIZE = 10;
export const DASHBOARD_MAX_PAGE_SIZE = 50;

export function capPageSize(pageSize: number): number {
  return Math.min(Math.max(1, pageSize), DASHBOARD_MAX_PAGE_SIZE);
}

export type ClientPaginationResult<T> = {
  total: number;
  totalPages: number;
  safePage: number;
  startIndex: number;
  endIndex: number;
  rows: T[];
};

export function paginateClientRows<T>(
  items: T[],
  page: number,
  pageSize: number,
): ClientPaginationResult<T> {
  const cappedSize = capPageSize(pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / cappedSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = total === 0 ? 0 : (safePage - 1) * cappedSize + 1;
  const endIndex = Math.min(safePage * cappedSize, total);
  const rows = items.slice(
    (safePage - 1) * cappedSize,
    safePage * cappedSize,
  );

  return { total, totalPages, safePage, startIndex, endIndex, rows };
}
