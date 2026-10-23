"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  DashboardDetailErrorShell,
  DashboardListLoadingShell,
} from "@/components/dashboard/dashboard-async-states";
import DashboardTable, {
  type DashboardColumn,
} from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { DashboardRowActionsMenuItem } from "@/components/dashboard/DashboardRowActionsMenu";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";

import { formatLeaseContractRowCopyText } from "@/components/dashboard/dashboard-row-copy-text";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import type { LeaseContractListItem } from "@/lib/api/lease-contracts";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { LEASE_CONTRACT_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
import {
  listSortQueryKeyPart,
  useDashboardTableListSort,
} from "@/lib/query/dashboard-table-list-sort";
import {
  isDashboardCatalogEmptyState,
  shouldShowDashboardListFilters,
} from "@/lib/hooks/dashboard-list-search-ui";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import {
  FLEET_LEASE_CONTRACT_LIST_INPUT_LIMITS,
  sanitizeRestrictedInputValue,
} from "@/lib/forms/restricted-input";
import {
  fleetLeaseContractDetailHref,
  fleetRenewLeaseContractHref,
} from "@/lib/navigation/fleet-static-routes";

function formatTermMonths(termMonths: number | null): string {
  if (termMonths == null || termMonths <= 0) return "—";

  return `${termMonths} month${termMonths === 1 ? "" : "s"} `;
}

export default function RenewalsExtensionsTable() {
  const router = useRouter();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { api, organizationId } = useLeaseApi();

  const canRenew =
    permissions.has("fleet_leasing.update") ||
    permissions.has("fleet_leasing.manage");

  const { searchInput, setSearchInput, debouncedSearch } =
    useDashboardListSearch();

  const onRenewalsListSearchChange = useCallback(
    (value: string) => {
      setSearchInput(
        sanitizeRestrictedInputValue("text", value, {
          maxLength: FLEET_LEASE_CONTRACT_LIST_INPUT_LIMITS.search,
        }),
      );
    },
    [setSearchInput],
  );

  const [page, setPage] = useState(1);

  const {
    sort: tableSort,
    onSortChange,
    listSortParams,
    serverSorted,
  } = useDashboardTableListSort(LEASE_CONTRACT_COLUMN_SORT);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tableSort]);

  const listEnabled = !!organizationId && !isAuthLoading;

  const listQuery = useQuery({
    queryKey: [
      "renewals-extensions-list",
      organizationId,
      debouncedSearch,
      page,
      ...listSortQueryKeyPart(listSortParams),
    ],
    queryFn: () =>
      api.getRenewalEligibleList({
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        ...listSortParams,
      }),
    enabled: listEnabled,
    ...dashboardListQueryOptions,
  });

  const contracts: LeaseContractListItem[] = listQuery.data?.items ?? [];
  const listTotal = listQuery.data?.total ?? 0;
  const listPage = listQuery.data?.page ?? page;

  const totalPages = Math.max(
    1,
    Math.ceil(listTotal / DASHBOARD_DEFAULT_PAGE_SIZE),
  );

  const isInitialLoading =
    isAuthLoading || (listQuery.isLoading && !listQuery.data);

  const showFilters = shouldShowDashboardListFilters({
    total: listTotal,
    searchInput,
    debouncedSearch,
    hasActiveSelectFilters: false,
    isFetchingWithPlaceholder:
      listQuery.isFetching && listQuery.isPlaceholderData,
  });

  const isEmptyCatalog = isDashboardCatalogEmptyState({
    total: listTotal,
    searchInput,
    debouncedSearch,
    hasActiveFilters: false,
    isFetching: listQuery.isFetching,
  });

  const columns: DashboardColumn<LeaseContractListItem>[] = [
    {
      key: "contractNumber",
      label: "Contract",
    },
    {
      key: "clientName",
      label: "Client",
      sortable: false,
    },
    {
      key: "startDate",
      label: "Start date",
      render: (row) => formatCalendarDateEnIn(row.startDate),
    },
    {
      key: "termMonths",
      label: "Term",
      sortable: false,
      render: (row) => formatTermMonths(row.termMonths),
    },
  ];

  const handleRenew = (row: LeaseContractListItem) => {
    navigateToEntityShell(router, fleetRenewLeaseContractHref(row.id), row.id, 'push');
  };

  const handleClearSearch = () => {
    setSearchInput("");
  };

  return (
    <DashboardLayout
      title="Renewals & Extensions"
      description="Active contracts eligible for renewal or term extension."
      pagination={
        !isInitialLoading &&
          !listQuery.isError &&
          !isEmptyCatalog &&
          contracts.length > 0
          ? {
            currentPage: listPage,
            totalPages,
            totalItems: listTotal,
            pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
            onPageChange: setPage,
          }
          : undefined
      }
    >
      {isInitialLoading && (
        <DashboardListLoadingShell label="Loading contracts…" />
      )}

      {listQuery.isError && !isInitialLoading && (
        <DashboardDetailErrorShell
          title="Failed to load contracts"
          error={listQuery.error}
          fallbackMessage="Failed to load contracts."
          onRetry={() => void listQuery.refetch()}
        />
      )}

      {!isInitialLoading && !listQuery.isError && (
        <>
          {showFilters && (
            <DashboardFilters
              searchValue={searchInput}
              searchPlaceholder="Search contract ID or client"
              onSearchChange={onRenewalsListSearchChange}
              onClear={handleClearSearch}
            />
          )}

          {isEmptyCatalog ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
              No active contracts are eligible for renewal yet.
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
              <h3 className="text-sm font-semibold text-gray-900">
                No contracts found
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Try a different search term.
              </p>

              <button
                type="button"
                onClick={handleClearSearch}
                className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div
              className={showFilters ? "mt-4" : undefined}
              aria-busy={
                listQuery.isFetching && listQuery.isPlaceholderData
              }
            >
              <DashboardTable
                columns={columns}
                data={contracts}
                sortState={tableSort}
                onSortChange={onSortChange}
                serverSorted={serverSorted}
                getRowKey={(row) => row.id}
                renderActions={(row) => (
                  <DashboardTableActions
                    status="active"
                    navigationEntityId={row.id}
                    viewHref={fleetLeaseContractDetailHref(row.id)}
                    copyText={formatLeaseContractRowCopyText(row)}
                    renderAdditionalMenuItems={() =>
                      canRenew ? (
                        <DashboardRowActionsMenuItem
                          icon={<RefreshCw className="h-4 w-4" />}
                          label="Renew"
                          onSelect={() => handleRenew(row)}
                        />
                      ) : null
                    }
                  />
                )}
              />
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
