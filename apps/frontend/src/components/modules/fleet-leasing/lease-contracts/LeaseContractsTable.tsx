"use client";

import { useEffect, useState } from "react";
import { Power } from "lucide-react";
import { DashboardRowActionsMenuItem } from "@/components/dashboard/DashboardRowActionsMenu";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { formatLeaseContractRowCopyText } from "@/components/dashboard/dashboard-row-copy-text";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable, {
  type DashboardColumn,
} from "@/components/dashboard/DashboardTable";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import type {
  LeaseContractListItem,
  LeaseContractStatusFilter,
} from "@/lib/api/lease-contracts";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  LEASE_CONTRACT_STATUS_UPDATE_ERROR,
  showErrorToast,
  showLeaseContractActivatedToast,
  showLeaseContractDeactivatedToast,
  showLeaseContractReactivatedToast,
} from "@/lib/toast/show-toast";
import {
  isDashboardCatalogEmptyState,
  shouldShowDashboardListFilters,
} from "@/lib/hooks/dashboard-list-search-ui";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
type LeaseListRowAction = "deactivate" | "reactivate";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import {
  canActivateLeaseContractListRow,
  canDeactivateLeaseContractListRow,
  canEditLeaseContractListRow,
  canReactivateLeaseContractListRow,
} from "./lease-contract-list-row-actions";
import { leaseStatusPillClass } from "@/lib/lease-contract/lease-contract-status-display";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${leaseStatusPillClass(status)}`}
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

type LeaseListActionTarget = {
  contract: LeaseContractListItem;
  action: LeaseListRowAction;
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
  const [activateTarget, setActivateTarget] =
    useState<LeaseContractListItem | null>(null);
  const [listActionTarget, setListActionTarget] =
    useState<LeaseListActionTarget | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const listEnabled = !!organizationId && !isAuthLoading;

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
      queryKey: ["renewals-extensions-list", organizationId],
    });
  };

  const statusMutation = useMutation({
    mutationFn: async (input: {
      contractId: string;
      kind: "activate" | "deactivate" | "reactivate";
      reason?: string;
    }) => {
      if (input.kind === "activate") {
        return api.activate(input.contractId);
      }
      if (input.kind === "deactivate") {
        return api.deactivate(
          input.contractId,
          input.reason ?? "",
        );
      }
      return api.reactivate(input.contractId);
    },
    onSuccess: (_data, variables) => {
      invalidateLeaseListQueries();
      if (variables.kind === "activate") {
        showLeaseContractActivatedToast();
      } else if (variables.kind === "deactivate") {
        showLeaseContractDeactivatedToast();
      } else {
        showLeaseContractReactivatedToast();
      }
      setActivateTarget(null);
      setListActionTarget(null);
    },
    onError: (error) => {
      const message =
        error instanceof ApiClientError
          ? error.message || LEASE_CONTRACT_STATUS_UPDATE_ERROR
          : LEASE_CONTRACT_STATUS_UPDATE_ERROR;
      showErrorToast(message);
    },
  });

  const handleEdit = (contract: LeaseContractListItem) => {
    router.push(
      `/fleet-leasing/lease-contracts/${encodeURIComponent(contract.id)}/edit`,
    );
  };

  const handleConfirmActivate = () => {
    if (!activateTarget || statusMutation.isPending) {
      return;
    }
    void statusMutation.mutateAsync({
      contractId: activateTarget.id,
      kind: "activate",
    });
  };

  const handleConfirmListAction = (reason?: string) => {
    if (!listActionTarget || statusMutation.isPending) {
      return;
    }
    const kind =
      listActionTarget.action === "deactivate"
        ? "deactivate"
        : "reactivate";
    void statusMutation.mutateAsync({
      contractId: listActionTarget.contract.id,
      kind,
      reason,
    });
  };

  const columns: DashboardColumn<LeaseContractListItem>[] = [
    { key: "contractNumber", label: "Contract No." },
    { key: "clientName", label: "Company Name" },
    { key: "assetClasses", label: "Asset Class" },
    {
      key: "startDate",
      label: "Start Date",
      render: (row) => formatCalendarDateEnIn(row.startDate),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const renderRowActions = (row: LeaseContractListItem) => {
    const showEdit = canUpdate && canEditLeaseContractListRow(row);
    const showDeactivate = canUpdate && canDeactivateLeaseContractListRow(row);
    const showReactivate = canUpdate && canReactivateLeaseContractListRow(row);
    const showActivate =
      canUpdate && canActivateLeaseContractListRow(row);

    const listRowStatus: "active" | "inactive" =
      row.rawStatus === "active" ? "active" : "inactive";

    return (
      <DashboardTableActions
        status={listRowStatus}
        viewHref={`/fleet-leasing/lease-contracts/detail/?leaseId=${encodeURIComponent(row.id)}`}
        copyText={formatLeaseContractRowCopyText(row)}
        onEdit={showEdit ? () => handleEdit(row) : undefined}
        renderAdditionalMenuItems={() => (
          <>
            {showActivate ? (
              <DashboardRowActionsMenuItem
                icon={<Power className="h-4 w-4 text-green-700" />}
                label="Activate"
                className="text-green-700"
                onSelect={() => setActivateTarget(row)}
              />
            ) : null}
            {showDeactivate ? (
              <DashboardRowActionsMenuItem
                icon={<Power className="h-4 w-4" />}
                label="Deactivate"
                onSelect={() =>
                  setListActionTarget({
                    contract: row,
                    action: "deactivate",
                  })
                }
              />
            ) : null}
            {showReactivate ? (
              <DashboardRowActionsMenuItem
                icon={<Power className="h-4 w-4" />}
                label="Reactivate"
                onSelect={() =>
                  setListActionTarget({
                    contract: row,
                    action: "reactivate",
                  })
                }
              />
            ) : null}
          </>
        )}
      />
    );
  };

  return (
    <>
      {isInitialLoading && (
        <div
          className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white"
          aria-busy="true"
          aria-label="Loading lease contracts"
        >
          <p className="text-sm text-gray-500">Loading lease contracts…</p>
        </div>
      )}

      {listQuery.isError && !isInitialLoading && (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white">
          <p className="text-sm font-medium text-red-600">
            Failed to load lease contracts.
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
          )}

          {isEmptyCatalog ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
              No lease contracts yet.
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
              <h3 className="text-sm font-semibold text-gray-900">
                No contracts found
              </h3>
              <p className="mt-1 text-xs text-gray-500">
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
              <div
                className={showFilters ? "mt-4" : undefined}
                aria-busy={listQuery.isFetching && listQuery.isPlaceholderData}
              >
                <DashboardTable
                  columns={columns}
                  data={contracts}
                  getRowKey={(row) => row.id}
                  renderActions={renderRowActions}
                />
              </div>
              <DashboardTablePagination
                page={listPage}
                pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
                total={listTotal}
                onPageChange={setPage}
                disabled={listQuery.isFetching || statusMutation.isPending}
              />
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={activateTarget !== null}
        title="Activate contract?"
        message={
          activateTarget
            ? `${activateTarget.contractNumber} will move to Active or Awaiting Assets per allocation.`
            : "This contract will be activated."
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateTarget(null);
          }
        }}
        onConfirm={handleConfirmActivate}
      />

      <ReasonRequiredDialog
        open={
          listActionTarget?.action === "deactivate" &&
          listActionTarget !== null
        }
        title="Deactivate contract?"
        description={
          listActionTarget?.contract.contractNumber ? (
            <>
              <span className="font-medium text-gray-900">
                {listActionTarget.contract.contractNumber}
              </span>{" "}
              will be put on hold. Billing continues until all vehicles are
              returned and registered.
            </>
          ) : (
            "This contract will be deactivated."
          )
        }
        reasonLabel="Reason for deactivation"
        confirmLabel="Deactivate"
        isPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setListActionTarget(null);
          }
        }}
        onConfirm={(reason) => {
          handleConfirmListAction(reason);
        }}
      />

      <ConfirmDialog
        open={
          listActionTarget?.action === "reactivate" &&
          listActionTarget !== null
        }
        title="Reactivate contract?"
        message={
          listActionTarget?.contract.contractNumber
            ? `${listActionTarget.contract.contractNumber} will return to Active or Awaiting Assets per allocation.`
            : "This contract will be reactivated."
        }
        confirmLabel="Reactivate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setListActionTarget(null);
          }
        }}
        onConfirm={handleConfirmListAction}
      />
    </>
  );
}
