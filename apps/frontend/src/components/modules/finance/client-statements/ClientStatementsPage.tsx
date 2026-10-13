
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";

import { useAuth } from "@/providers/auth-provider";
import { fetchClientStatementsApi } from "@/lib/api/finance/client-statements";
import { formatInrFromMinor } from "@/lib/format/money-format";

import {
  findPeriodPresetByRange,
  getClientStatementPeriodPresets,
} from "@/lib/finance/client-statement-periods";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { financeClientStatementDetailHref } from "@/lib/navigation/finance-static-routes";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";

import {
  isDashboardCatalogEmptyState,
  shouldShowDashboardListFilters,
} from "@/lib/hooks/dashboard-list-search-ui";

function moneyCell(
  minor: number,
  muted: boolean,
  emphasizeBalance?: boolean,
): ReactNode {
  const base = muted ? "text-slate-700" : "text-gray-900";

  const balanceClass =
    emphasizeBalance && minor > 0 && !muted
      ? "font-medium text-[#FE5720]"
      : base;

  return (
    <span className={balanceClass}>
      {formatInrFromMinor(minor)}
    </span>
  );
}

export default function ClientStatementsPage() {
  const {
    token,
    organizationId,
    isLoading: authLoading,
    getApiError,
  } = useAuth();

  const periodPresets = useMemo(
    () => getClientStatementPeriodPresets(),
    [],
  );

  const defaultPeriod = periodPresets[0]!;

  const [periodStart, setPeriodStart] = useState(
    defaultPeriod.periodStart,
  );
  const [periodEnd, setPeriodEnd] = useState(
    defaultPeriod.periodEnd,
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, periodStart, periodEnd]);

  const listEnabled =
    Boolean(token) && Boolean(organizationId) && !authLoading;

  const listQuery = useQuery({
    queryKey: [
      "finance-client-statements",
      organizationId,
      debouncedSearch,
      periodStart,
      periodEnd,
      page,
    ],
    queryFn: () =>
      fetchClientStatementsApi(token!, {
        organizationId: organizationId!,
        periodStart,
        periodEnd,
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
      }),
    enabled: listEnabled,
    ...dashboardListQueryOptions,
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 0;

  const hasAnyBillingInvoicesEver =
    listQuery.data?.hasAnyBillingInvoicesEver ?? false;

  const isInitialLoading =
    authLoading || (listQuery.isLoading && !listQuery.data);

  const showOrgEmpty =
    !isInitialLoading &&
    !listQuery.isError &&
    listQuery.data !== undefined &&
    !hasAnyBillingInvoicesEver;

  const showFilters = shouldShowDashboardListFilters({
    total,
    searchInput: search,
    debouncedSearch,
    hasActiveSelectFilters: false,
    isFetchingWithPlaceholder:
      listQuery.isFetching && listQuery.isPlaceholderData,
  });

  const isEmptyCatalog = isDashboardCatalogEmptyState({
    total,
    searchInput: search,
    debouncedSearch,
    hasActiveFilters: false,
    isFetching: listQuery.isFetching,
  });

  const handleClearFilters = () => {
    setSearch("");
    setPage(1);
  };

  const selectedPreset = findPeriodPresetByRange(
    periodStart,
    periodEnd,
    periodPresets,
  );

  const periodSelect = (
    <div className="w-full shrink-0 sm:w-[250px]">
      <select
        aria-label="Select statement period"
        className="h-9 w-full rounded-md border border-[#FE5720]/30 bg-[#FE5720]/5 px-3 text-sm font-medium text-[#FE5720] outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
        value={
          selectedPreset?.id ?? `${periodStart}_${periodEnd} `
        }
        onChange={(event) => {
          const preset = periodPresets.find(
            (item) => item.id === event.target.value,
          );

          if (preset) {
            setPeriodStart(preset.periodStart);
            setPeriodEnd(preset.periodEnd);
          }
        }}
      >
        <option
          value={selectedPreset?.id ?? `${periodStart}_${periodEnd} `}
          disabled
        >
          {`Period: ${selectedPreset?.label ??
            `${periodStart} – ${periodEnd}`
            } `}
        </option>

        {periodPresets
          .filter((preset) => preset.id !== selectedPreset?.id)
          .map((preset) => (
            <option key={preset.id} value={preset.id}>
              {`Period: ${preset.label} `}
            </option>
          ))}
      </select>
    </div>
  );

  const columns = [
    {
      key: "clientName",
      label: "CLIENT",
      render: (row: (typeof items)[number]) => (
        <span
          className={
            row.hasBillingActivityInPeriod
              ? "font-medium text-gray-900"
              : "text-slate-700"
          }
        >
          {row.clientName}
        </span>
      ),
    },
    {
      key: "invoiceCount",
      label: "INVOICES",
      render: (row: (typeof items)[number]) => (
        <span
          className={
            row.hasBillingActivityInPeriod
              ? "text-gray-900"
              : "text-slate-700"
          }
        >
          {row.invoiceCount}
        </span>
      ),
    },
    {
      key: "totalBilledMinor",
      label: "TOTAL BILLED",
      render: (row: (typeof items)[number]) =>
        moneyCell(
          row.totalBilledMinor,
          !row.hasBillingActivityInPeriod,
        ),
    },
    {
      key: "totalPaidMinor",
      label: "TOTAL PAID",
      render: (row: (typeof items)[number]) =>
        moneyCell(
          row.totalPaidMinor,
          !row.hasBillingActivityInPeriod,
        ),
    },
    {
      key: "balanceDueMinor",
      label: "BALANCE DUE",
      render: (row: (typeof items)[number]) =>
        moneyCell(
          row.balanceDueMinor,
          !row.hasBillingActivityInPeriod,
          true,
        ),
    },
  ];

  const infoBanner = (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
      Cancelled billing invoices are listed on client detail but
      excluded from Total Billed, Total Paid, and Balance Due.
      Sale and purchase invoices are not included — billing
      invoices only.
    </div>
  );

  return (
    <DashboardLayout
      title="Client Statements"
      description="What every client has been billed, and what they still owe, for a period."
      pagination={
        !showOrgEmpty && totalPages > 1
          ? {
            currentPage: page,
            totalPages,
            totalItems: total,
            pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
            onPageChange: setPage,
          }
          : undefined
      }
    >
      <>
        {isInitialLoading ? (
          <div
            className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white"
            aria-busy="true"
            aria-label="Loading client statements"
          >
            <p className="text-sm text-gray-500">
              Loading client statements...
            </p>
          </div>
        ) : listQuery.isError ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white p-6">
            <p className="text-sm font-medium text-red-600">
              Failed to load client statements.
            </p>

            <p className="mt-1 text-sm text-gray-600">
              {getApiError?.(listQuery.error) ?? "Request failed."}
            </p>

            <button
              type="button"
              onClick={() => void listQuery.refetch()}
              className="mt-2 text-sm text-gray-600 underline"
            >
              Try again
            </button>
          </div>
        ) : showOrgEmpty ? (
          <DashboardEmptyState
            icon={
              <FileText
                className="h-7 w-7"
                strokeWidth={1.4}
              />
            }
            title="No billing invoices yet"
            description="Client statements will appear once Billing invoices have been recorded."
          />
        ) : (
          <>
            {/* Neutral gray information banner */}
            {infoBanner}

            {/* Search and period selector */}
            <div className="mb-4">
              <DashboardFilters
                searchValue={search}
                searchPlaceholder="Search by client name"
                onSearchChange={setSearch}
                onClear={handleClearFilters}
                showClearButton={false}
              >
                {periodSelect}
              </DashboardFilters>
            </div>

            {/* Empty states and table */}
            {isEmptyCatalog ? (
              <DashboardEmptyState
                icon={
                  <FileText
                    className="h-7 w-7"
                    strokeWidth={1.4}
                  />
                }
                title="No client statements yet"
                description="Client statements will appear here when billing invoices are available."
              />
            ) : items.length === 0 ? (
              <DashboardEmptyState
                icon={
                  <FileText
                    className="h-7 w-7"
                    strokeWidth={1.4}
                  />
                }
                title="No client statements found"
                description="Try changing your search for this period."
                buttonLabel="Clear search"
                onButtonClick={handleClearFilters}
              />
            ) : (
              <div
                className={showFilters ? "mt-4" : undefined}
                aria-busy={
                  listQuery.isFetching &&
                  listQuery.isPlaceholderData
                }
              >
                <DashboardTable
                  columns={columns}
                  data={items}
                  getRowKey={(row) => row.clientId}
                  renderActions={(row) => (
                    <DashboardTableActions
                      status="active"
                      hideEdit
                      alwaysShowOverflowMenu
                      viewHref={financeClientStatementDetailHref(
                        row.clientId,
                        periodStart,
                        periodEnd,
                      )}
                      copyText={[
                        row.clientName,
                        String(row.invoiceCount),
                        formatInrFromMinor(row.totalBilledMinor),
                        formatInrFromMinor(row.totalPaidMinor),
                        formatInrFromMinor(row.balanceDueMinor),
                      ].join("\t")}
                    />
                  )}
                />
              </div>
            )}
          </>
        )}
      </>
    </DashboardLayout>
  );
}