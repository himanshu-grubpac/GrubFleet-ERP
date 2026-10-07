"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
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

const PAGE_SIZE = 10;

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
    <span className={balanceClass}>{formatInrFromMinor(minor)}</span>
  );
}

export default function ClientStatementsPage() {
  const { token, organizationId, isLoading: authLoading, getApiError } =
    useAuth();
  const periodPresets = useMemo(() => getClientStatementPeriodPresets(), []);
  const defaultPeriod = periodPresets[0]!;

  const [periodStart, setPeriodStart] = useState(defaultPeriod.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.periodEnd);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, periodStart, periodEnd]);

  const listEnabled = !!token && !!organizationId && !authLoading;

  const listQuery = useQuery({
    queryKey: [
      "finance-client-statements",
      organizationId,
      page,
      debouncedSearch,
      periodStart,
      periodEnd,
    ],
    queryFn: () =>
      fetchClientStatementsApi(token!, {
        organizationId: organizationId!,
        periodStart,
        periodEnd,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
    enabled: listEnabled,
    ...dashboardListQueryOptions,
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 0;
  const hasAnyBillingInvoicesEver =
    listQuery.data?.hasAnyBillingInvoicesEver ?? false;

  const showOrgEmpty =
    !listQuery.isLoading &&
    !listQuery.isError &&
    listQuery.data &&
    !hasAnyBillingInvoicesEver;

  const periodSelect = (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      Period
      <select
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        value={
          findPeriodPresetByRange(periodStart, periodEnd, periodPresets)?.id ??
          `${periodStart}_${periodEnd}`
        }
        onChange={(e) => {
          const preset = periodPresets.find((p) => p.id === e.target.value);
          if (preset) {
            setPeriodStart(preset.periodStart);
            setPeriodEnd(preset.periodEnd);
          }
        }}
      >
        {periodPresets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );

  const infoBanner = (
    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      Cancelled billing invoices are listed on client detail but excluded from
      Total Billed, Total Paid, and Balance Due. Sale and purchase invoices are
      not included — billing invoices only.
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
              pageSize: PAGE_SIZE,
              onPageChange: setPage,
            }
          : undefined
      }
    >
      <div className="px-6 pb-6">
        {showOrgEmpty ? (
          <DashboardEmptyState
            title="No billing invoices recorded yet"
            description="Client statements roll up once Billing invoices exist in Invoices."
            icon={<FileText className="h-7 w-7" strokeWidth={1.4} />}
          />
        ) : (
          <>
            {infoBanner}
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              {periodSelect}
            </div>

            <DashboardFilters
              searchValue={search}
              searchPlaceholder="Search by client name"
              onSearchChange={setSearch}
              onClear={() => setSearch("")}
            />

            {listQuery.isLoading ? (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Loading client statements…
              </div>
            ) : listQuery.isError ? (
              <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-800">
                <p>
                  Could not load client statements.
                  {listQuery.error
                    ? ` ${getApiError?.(listQuery.error) ?? "Request failed."}`
                    : null}
                </p>
                <button
                  type="button"
                  className="mt-2 font-medium underline"
                  onClick={() => void listQuery.refetch()}
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No clients match your search for this period.
              </div>
            ) : (
              <div className="mt-4">
                <DashboardTable
                  columns={[
                    {
                      key: "clientName",
                      label: "CLIENT",
                      render: (row) => (
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
                      render: (row) => (
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
                      render: (row) =>
                        moneyCell(
                          row.totalBilledMinor,
                          !row.hasBillingActivityInPeriod,
                        ),
                    },
                    {
                      key: "totalPaidMinor",
                      label: "TOTAL PAID",
                      render: (row) =>
                        moneyCell(
                          row.totalPaidMinor,
                          !row.hasBillingActivityInPeriod,
                        ),
                    },
                    {
                      key: "balanceDueMinor",
                      label: "BALANCE DUE",
                      render: (row) =>
                        moneyCell(
                          row.balanceDueMinor,
                          !row.hasBillingActivityInPeriod,
                          true,
                        ),
                    },
                  ]}
                  data={items}
                  getRowKey={(row) => row.clientId}
                  renderActions={(row) => (
                    <DashboardTableActions
                      status="active"
                      hideEdit
                      viewHref={financeClientStatementDetailHref(
                        row.clientId,
                        periodStart,
                        periodEnd,
                      )}
                      copyText={`${row.clientName}\t${row.invoiceCount}\t${formatInrFromMinor(row.totalBilledMinor)}\t${formatInrFromMinor(row.totalPaidMinor)}\t${formatInrFromMinor(row.balanceDueMinor)}`}
                    />
                  )}
                />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
