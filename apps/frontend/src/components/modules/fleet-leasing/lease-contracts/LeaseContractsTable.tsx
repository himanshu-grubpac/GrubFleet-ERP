"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatLeaseContractRowCopyText } from "@/components/dashboard/dashboard-row-copy-text";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";
import { DataTable, type Column } from "@grubpac/ui-kit";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import type {
  LeaseContractListItem,
  LeaseContractStatusFilter,
} from "@/lib/api/lease-contracts";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { showErrorToast } from "@/lib/toast/show-toast";
import {
  isDashboardCatalogEmptyState,
  shouldShowDashboardListFilters,
} from "@/lib/hooks/dashboard-list-search-ui";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import LeaseContractActionModal, {
  type LeaseContractAction,
} from "./LeaseContractActionModal";
import LeaseContractTableActions from "./LeaseContractTableActions";
import {
  canActivateDraftLeaseContractListRow,
  canDeactivateLeaseContractListRow,
  canEditLeaseContractListRow,
  canReactivateLeaseContractListRow,
} from "./lease-contract-list-row-actions";

// ─── KPI Summary Bar ──────────────────────────────────────────────────────────

function SummaryBar({
  activeContracts,
  awaitingAssets,
  pendingApproval,
  draft,
}: {
  activeContracts: number;
  awaitingAssets: number;
  pendingApproval: number;
  draft: number;
}) {
  const stats = [
    { label: "Active", value: activeContracts, color: "text-green-600" },
    { label: "Awaiting Assets", value: awaitingAssets, color: "text-amber-600" },
    { label: "Pending Approval", value: pendingApproval, color: "text-blue-600" },
    { label: "Draft", value: draft, color: "text-slate-500" },
  ];

  return (
    <div className="flex gap-6 border-b border-slate-100 px-5 py-3">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
          <span className="text-xs text-slate-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: "bg-green-100 text-green-700",
    Draft: "bg-amber-100 text-amber-700",
    "Pending Approval": "bg-blue-100 text-blue-700",
    "Awaiting Assets": "bg-orange-100 text-orange-700",
    Deactivated: "bg-slate-100 text-slate-600",
    "Billing Paused": "bg-purple-100 text-purple-700",
    "Pending Termination": "bg-red-100 text-red-600",
    Closed: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
        map[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

const LEASE_STATUS_FILTER_OPTIONS: {
  label: string;
  value: LeaseContractStatusFilter;
}[] = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Pending approval", value: "pending_approval" },
  { label: "Awaiting assets", value: "awaiting_assets" },
  { label: "Deactivated", value: "deactivated" },
  { label: "Completed", value: "completed" },
  { label: "Billing paused", value: "billing_paused" },
  { label: "Pending termination", value: "pending_termination" },
];

// ─── Table ────────────────────────────────────────────────────────────────────

type LeaseActionModalTarget = {
  contract: LeaseContractListItem;
  action: LeaseContractAction;
};

export default function LeaseContractsTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { api, organizationId } = useLeaseApi();

  const canUpdate =
    permissions.has("fleet_leasing.update") ||
    permissions.has("fleet_leasing.manage");

  const { searchInput, setSearchInput, debouncedSearch } =
    useDashboardListSearch();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [activateDraftTarget, setActivateDraftTarget] =
    useState<LeaseContractListItem | null>(null);
  const [actionModalTarget, setActionModalTarget] =
    useState<LeaseActionModalTarget | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const listEnabled = !!organizationId && !isAuthLoading;

  const { data: summary } = useQuery({
    queryKey: ["lease-contracts-summary", organizationId],
    queryFn: () => api.getSummary(),
    enabled: listEnabled,
    ...dashboardListQueryOptions,
  });

  const listQuery = useQuery({
    queryKey: [
      "lease-contracts-list",
      organizationId,
      debouncedSearch,
      statusFilter,
      page,
    ],
    queryFn: () =>
      api.getList({
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        statusFilter: statusFilter
          ? (statusFilter as LeaseContractStatusFilter)
          : undefined,
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
    hasActiveSelectFilters: statusFilter !== "",
    isFetchingWithPlaceholder:
      listQuery.isFetching && listQuery.isPlaceholderData,
  });

  const isEmptyCatalog = isDashboardCatalogEmptyState({
    total: listTotal,
    searchInput,
    debouncedSearch,
    hasActiveFilters: statusFilter !== "",
    isFetching: listQuery.isFetching,
  });

  const handleClearFilters = () => {
    setSearchInput("");
    setStatusFilter("");
  };

  const invalidateLeaseListQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: ["lease-contracts-list", organizationId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["lease-contracts-summary", organizationId],
    });
  };

  const statusMutation = useMutation({
    mutationFn: async (input: {
      contractId: string;
      kind: "activate" | "deactivate" | "reactivate";
    }) => {
      if (input.kind === "activate") {
        return api.activate(input.contractId);
      }
      if (input.kind === "deactivate") {
        return api.deactivate(input.contractId);
      }
      return api.reactivate(input.contractId);
    },
    onSuccess: () => {
      invalidateLeaseListQueries();
      setActivateDraftTarget(null);
      setActionModalTarget(null);
    },
    onError: (error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not update contract status. Please try again.";
      showErrorToast(message);
    },
  });

  const handleEdit = (contract: LeaseContractListItem) => {
    router.push(
      `/fleet-leasing/lease-contracts/${encodeURIComponent(contract.id)}/edit`,
    );
  };

  const handleConfirmDraftActivate = () => {
    if (!activateDraftTarget || statusMutation.isPending) {
      return;
    }
    void statusMutation.mutateAsync({
      contractId: activateDraftTarget.id,
      kind: "activate",
    });
  };

  const handleConfirmActionModal = () => {
    if (!actionModalTarget || statusMutation.isPending) {
      return;
    }
    const kind =
      actionModalTarget.action === "deactivate"
        ? "deactivate"
        : "reactivate";
    void statusMutation.mutateAsync({
      contractId: actionModalTarget.contract.id,
      kind,
    });
  };

  const columns: Column<LeaseContractListItem>[] = [
    {
      header: "Contract No.",
      accessorKey: "contractNumber",
      sortable: true,
    },
    {
      header: "Company Name",
      accessorKey: "clientName",
      sortable: true,
    },
    {
      header: "Asset Class",
      accessorKey: "assetClasses",
      sortable: true,
    },
    {
      header: "Start Date",
      accessorKey: "startDate",
      sortable: true,
      cell: ({ row }) => <span>{row.startDate ?? "—"}</span>,
    },
    {
      header: "Status",
      accessorKey: "status",
      sortable: true,
      cell: ({ row }) => <StatusBadge status={row.status} />,
    },
    {
      header: "Action",
      accessorKey: "id",
      headerClassName: "text-right w-[168px]",
      className: "text-right",
      cell: ({ row }) => {
        const showEdit = canUpdate && canEditLeaseContractListRow(row);
        const showDeactivate =
          canUpdate && canDeactivateLeaseContractListRow(row);
        const showReactivate =
          canUpdate && canReactivateLeaseContractListRow(row);
        const showActivateDraft =
          canUpdate && canActivateDraftLeaseContractListRow(row);

        return (
          <LeaseContractTableActions
            leaseId={row.id}
            copyText={formatLeaseContractRowCopyText(row)}
            showEdit={showEdit}
            showDeactivate={showDeactivate}
            showReactivate={showReactivate}
            showActivateDraft={showActivateDraft}
            onEdit={showEdit ? () => handleEdit(row) : undefined}
            onDeactivate={
              showDeactivate
                ? () =>
                    setActionModalTarget({
                      contract: row,
                      action: "deactivate",
                    })
                : undefined
            }
            onReactivate={
              showReactivate
                ? () =>
                    setActionModalTarget({
                      contract: row,
                      action: "reactivate",
                    })
                : undefined
            }
            onActivateDraft={
              showActivateDraft
                ? () => setActivateDraftTarget(row)
                : undefined
            }
          />
        );
      },
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {summary && <SummaryBar {...summary} />}

      {isInitialLoading && (
        <div
          className="min-h-[240px] animate-pulse rounded-lg bg-gray-100 mx-5 my-4"
          aria-busy="true"
          aria-label="Loading lease contracts"
        />
      )}

      {listQuery.isError && !isInitialLoading && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-red-500">
          Failed to load lease contracts. Please try again.
          <button
            type="button"
            onClick={() => void listQuery.refetch()}
            className="text-xs font-medium text-[#FE5720] hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {!isInitialLoading && !listQuery.isError && (
        <>
          {showFilters && (
            <div className="border-b border-slate-100 px-5 pt-4">
              <DashboardFilters
                searchValue={searchInput}
                searchPlaceholder="Search by contract no. or client…"
                onSearchChange={setSearchInput}
                selectFilters={[
                  {
                    key: "status",
                    label: "All statuses",
                    options: LEASE_STATUS_FILTER_OPTIONS,
                  },
                ]}
                filterValues={{ status: statusFilter }}
                onFilterChange={(_key, value) => setStatusFilter(value)}
                onClear={handleClearFilters}
              />
            </div>
          )}

          {isEmptyCatalog ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              No lease contracts yet.
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-slate-500">
              <p className="font-medium text-slate-700">No contracts found</p>
              <p className="mt-1 text-xs">
                Try changing your search or status filter.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div aria-busy={listQuery.isFetching && listQuery.isPlaceholderData}>
                <DataTable
                  data={contracts}
                  columns={columns}
                  getRowId={(row) => row.id}
                />
              </div>
              <div className="px-5 pb-4">
                <DashboardTablePagination
                  page={listPage}
                  pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
                  total={listTotal}
                  onPageChange={setPage}
                  disabled={
                    listQuery.isFetching || statusMutation.isPending
                  }
                />
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={activateDraftTarget !== null}
        title="Activate contract?"
        message={
          activateDraftTarget
            ? `${activateDraftTarget.contractNumber} will be activated and move forward in the contract lifecycle.`
            : "This contract will be activated."
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateDraftTarget(null);
          }
        }}
        onConfirm={handleConfirmDraftActivate}
      />

      <LeaseContractActionModal
        isOpen={actionModalTarget !== null}
        action={actionModalTarget?.action ?? "deactivate"}
        contractNumber={
          actionModalTarget?.contract.contractNumber ?? ""
        }
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActionModalTarget(null);
          }
        }}
        onConfirm={handleConfirmActionModal}
      />
    </div>
  );
}
