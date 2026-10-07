"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardTable, {
  type DashboardColumn,
} from "@/components/dashboard/DashboardTable";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { DashboardRowActionsMenuItem } from "@/components/dashboard/DashboardRowActionsMenu";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";
import { formatLeaseContractRowCopyText } from "@/components/dashboard/dashboard-row-copy-text";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import type { LeaseContractListItem } from "@/lib/api/lease-contracts";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  isDashboardCatalogEmptyState,
  shouldShowDashboardListFilters,
} from "@/lib/hooks/dashboard-list-search-ui";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import DashboardFilters from "@/components/dashboard/DashboardFilters";

function formatTermMonths(termMonths: number | null): string {
  if (termMonths == null || termMonths <= 0) return "—";
  return `${termMonths} month${termMonths === 1 ? "" : "s"}`;
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
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const listEnabled = !!organizationId && !isAuthLoading;

  const listQuery = useQuery({
    queryKey: [
      "renewals-extensions-list",
      organizationId,
      debouncedSearch,
      page,
    ],
    queryFn: () =>
      api.getRenewalEligibleList({
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
      }),
    enabled: listEnabled,
    ...dashboardListQueryOptions,
  });

  const contracts: LeaseContractListItem[] = listQuery.data?.items ?? [];
  const listTotal = listQuery.data?.total ?? 0;
  const listPage = listQuery.data?.page ?? page;

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
    { key: "contractNumber", label: "Contract" },
    { key: "clientName", label: "Client" },
    {
      key: "startDate",
      label: "Start date",
      render: (row) => formatCalendarDateEnIn(row.startDate),
    },
    {
      key: "termMonths",
      label: "Term",
      render: (row) => formatTermMonths(row.termMonths),
    },
  ];

  const handleRenew = (row: LeaseContractListItem) => {
    router.push(
      `/fleet-leasing/renewals-extensions/renew?leaseId=${encodeURIComponent(row.id)}`,
    );
  };

  const handleClearSearch = () => {
    setSearchInput("");
  };

  return (
    <>
      {isInitialLoading && (
        <div
          className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white"
          aria-busy="true"
          aria-label="Loading eligible contracts"
        >
          <p className="text-sm text-gray-500">Loading contracts…</p>
        </div>
      )}

      {listQuery.isError && !isInitialLoading && (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white">
          <p className="text-sm font-medium text-red-600">
            Failed to load contracts.
          </p>
          <button
            type="button"
            onClick={() => void listQuery.refetch()}
            className="mt-2 text-sm text-gray-600 underline"
          >
            Try again
          </button>
        </div>
      )}

      {!isInitialLoading && !listQuery.isError && (
        <>
          {showFilters && (
            <DashboardFilters
              searchValue={searchInput}
              searchPlaceholder="Search contract ID or client"
              onSearchChange={setSearchInput}
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
            <>
              <div
                className={showFilters ? "mt-4" : undefined}
                aria-busy={listQuery.isFetching && listQuery.isPlaceholderData}
              >
                <DashboardTable
                  columns={columns}
                  data={contracts}
                  getRowKey={(row) => row.id}
                  renderActions={(row) => (
                    <DashboardTableActions
                      status="active"
                      viewHref={`/fleet-leasing/lease-contracts/detail/?leaseId=${encodeURIComponent(row.id)}`}
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

              <DashboardTablePagination
                page={listPage}
                pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
                total={listTotal}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
