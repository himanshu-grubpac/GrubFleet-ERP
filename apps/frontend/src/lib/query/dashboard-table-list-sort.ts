"use client";

import { useCallback, useMemo, useState } from "react";

import type { DashboardTableSortState } from "@/components/dashboard/DashboardTable";
import type { ListSortParams } from "@/lib/query/list-sort-params";

/** Map DashboardTable column `key` → backend `sortBy` whitelist value (omit = not server-sortable). */
export type DashboardColumnSortByMap = Record<string, string | undefined>;

export function dashboardColumnSortToListParams(
  sort: DashboardTableSortState | null,
  columnToSortBy: DashboardColumnSortByMap,
): ListSortParams | undefined {
  if (!sort) return undefined;
  const sortBy = columnToSortBy[sort.key];
  if (!sortBy) return undefined;
  return { sortBy, sortOrder: sort.direction };
}

export function useDashboardTableListSort(
  columnToSortBy: DashboardColumnSortByMap,
) {
  const [sort, setSort] = useState<DashboardTableSortState | null>(null);

  const listSortParams = useMemo(
    () => dashboardColumnSortToListParams(sort, columnToSortBy),
    [sort, columnToSortBy],
  );

  const onSortChange = useCallback((next: DashboardTableSortState) => {
    setSort(next);
  }, []);

  const serverSorted = listSortParams != null;

  return {
    sort,
    onSortChange,
    listSortParams,
    serverSorted,
  };
}

/** Stable TanStack Query key segment for list sort params. */
export function listSortQueryKeyPart(
  listSortParams: ListSortParams | undefined,
): readonly [string | undefined, ListSortParams["sortOrder"] | undefined] {
  return [listSortParams?.sortBy, listSortParams?.sortOrder];
}
