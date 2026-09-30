import { keepPreviousData } from "@tanstack/react-query";

/** Shared TanStack Query defaults for paginated dashboard lists and org catalogs. */
export const DASHBOARD_LIST_STALE_TIME_MS = 30_000;
export const DASHBOARD_CATALOG_STALE_TIME_MS = 5 * 60_000;
export const DASHBOARD_LIST_GC_TIME_MS = 5 * 60_000;

export const dashboardListQueryOptions = {
  staleTime: DASHBOARD_LIST_STALE_TIME_MS,
  gcTime: DASHBOARD_LIST_GC_TIME_MS,
  placeholderData: keepPreviousData,
} as const;

export const dashboardCatalogQueryOptions = {
  staleTime: DASHBOARD_CATALOG_STALE_TIME_MS,
  gcTime: DASHBOARD_LIST_GC_TIME_MS,
} as const;
