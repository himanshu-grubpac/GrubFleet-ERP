import { keepPreviousData } from "@tanstack/react-query";

import { DASHBOARD_LIST_GC_TIME_MS } from "./dashboard-list-query-options";

/**
 * Fresh data for asset assignment surfaces (list, bulk wizard, single assign).
 * Does not change global dashboard list defaults elsewhere.
 */
export const assetAssignmentQueryOptions = {
    staleTime: 0,
    gcTime: DASHBOARD_LIST_GC_TIME_MS,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
} as const;

/** List tab return: refetch on focus without forcing remount refetch on every navigation. */
export const assetAssignmentListQueryOptions = {
    staleTime: 0,
    gcTime: DASHBOARD_LIST_GC_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
} as const;
