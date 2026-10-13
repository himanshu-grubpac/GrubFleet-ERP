"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { PackageSearch, Power } from "lucide-react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { DashboardRowActionsMenuItem } from "@/components/dashboard/DashboardRowActionsMenu";
import DashboardAssetClassNameCell from "@/components/dashboard/DashboardAssetClassNameCell";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTable, {
  type DashboardColumn,
} from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import type {
  LeaseContractListItem,
  LeaseContractStatusFilter,
} from "@/lib/api/lease-contracts";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  fleetLeaseContractDetailHref,
  fleetLeaseContractEditHref,
} from "@/lib/navigation/fleet-static-routes";
import { formatLeaseContractRowCopyText } from "@/components/dashboard/dashboard-row-copy-text";
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
import {
  canActivateLeaseContractListRow,
  canDeactivateLeaseContractListRow,
  canEditLeaseContractListRow,
  canReactivateLeaseContractListRow,
} from "@/components/modules/fleet-leasing/lease-contracts/lease-contract-list-row-actions";
import { leaseStatusPillClass } from "@/lib/lease-contract/lease-contract-status-display";

type LeaseListRowAction = "deactivate" | "reactivate";

type LeaseListActionTarget = {
  contract: LeaseContractListItem;
  action: LeaseListRowAction;
};

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

export default function LeaseContractsTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { api, organizationId } = useLeaseApi();

  const canCreate =
    permissions.has("fleet_leasing.create") ||
    permissions.has("fleet_leasing.manage");

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
        return api.deactivate(input.contractId, input.reason ?? "");
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
    router.push(fleetLeaseContractEditHref(contract.id));
  };

  const handleConfirmActivate = () => {
    if (!activateTarget || statusMutation.isPending) {
      return;
    }
    if (
      String(activateTarget.rawStatus).toLowerCase() === "draft" ||
      String(activateTarget.status).toLowerCase() === "draft"
    ) {
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
    const contract = listActionTarget.contract;
    const isDraft =
      String(contract.rawStatus).toLowerCase() === "draft" ||
      String(contract.status).toLowerCase() === "draft";
    if (isDraft) {
      return;
    }
    const kind =
      listActionTarget.action === "deactivate" ? "deactivate" : "reactivate";
    void statusMutation.mutateAsync({
      contractId: contract.id,
      kind,
      reason,
    });
  };

  const columns: DashboardColumn<LeaseContractListItem>[] = [
    { key: "contractNumber", label: "Contract No." },
    { key: "clientName", label: "Company Name" },
    {
      key: "assetClasses",
      label: "Asset Class",
      render: (row) => (
        <DashboardAssetClassNameCell
          name={row.assetClasses}
          copyAriaLabel="Copy asset class summary"
        />
      ),
    },
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
    const isDraft =
      String(row.rawStatus).toLowerCase() === "draft" ||
      String(row.status).toLowerCase() === "draft";

    const showEdit = canUpdate && canEditLeaseContractListRow(row);
    const showDeactivate =
      canUpdate && canDeactivateLeaseContractListRow(row) && !isDraft;
    const showReactivate =
      canUpdate && canReactivateLeaseContractListRow(row) && !isDraft;
    const showActivate =
      canUpdate && canActivateLeaseContractListRow(row) && !isDraft;

    const rawStatus = String(row.rawStatus).toLowerCase();
    const status = String(row.status).toLowerCase();

    const isActive = rawStatus === "active" || status === "active";
    const statusAction = isDraft
      ? null
      : isActive
        ? showDeactivate
          ? "deactivate"
          : null
        : showReactivate
          ? "reactivate"
          : showActivate
            ? "activate"
            : null;

    const listRowStatus: "active" | "inactive" = isActive
      ? "active"
      : "inactive";

    return (
      <DashboardTableActions
        status={listRowStatus}
        viewHref={fleetLeaseContractDetailHref(row.id)}
        copyText={formatLeaseContractRowCopyText(row)}
        allowEditWhenInactive
        alwaysShowOverflowMenu
        onEdit={showEdit ? () => handleEdit(row) : undefined}
        renderAdditionalMenuItems={() => (
          <>
            {statusAction === "activate" && (
              <DashboardRowActionsMenuItem
                icon={<Power className="h-4 w-4 text-green-700" />}
                label="Activate"
                className="text-green-700"
                onSelect={() => {
                  setActivateTarget(row);
                }}
              />
            )}
            {statusAction === "deactivate" && (
              <DashboardRowActionsMenuItem
                icon={<Power className="h-4 w-4" />}
                label="Deactivate"
                onSelect={() => {
                  setListActionTarget({
                    contract: row,
                    action: "deactivate",
                  });
                }}
              />
            )}
            {statusAction === "reactivate" && (
              <DashboardRowActionsMenuItem
                icon={<Power className="h-4 w-4" />}
                label="Reactivate"
                onSelect={() => {
                  setListActionTarget({
                    contract: row,
                    action: "reactivate",
                  });
                }}
              />
            )}
          </>
        )}
      />
    );
  };

  return (
    <DashboardLayout
      title="Lease Contracts"
      description="Manage fleet and leasing contracts."
      action={
        !isAuthLoading && canCreate ? (
          <Link href="/fleet-leasing/lease-contracts/new">
            <Button type="button">New Contract</Button>
          </Link>
        ) : undefined
      }
      pagination={{
        currentPage: listPage,
        totalPages,
        totalItems: listTotal,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        onPageChange: setPage,
      }}
    >
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
              <DashboardEmptyState
                icon={
                  <PackageSearch className="h-7 w-7" strokeWidth={1.4} />
                }
                title="No lease contracts yet"
                description="Create your first lease contract to start managing fleet and leasing agreements."
                buttonLabel="New Contract"
                onButtonClick={
                  canCreate
                    ? () => router.push("/fleet-leasing/lease-contracts/new")
                    : undefined
                }
              />
            ) : contracts.length === 0 ? (
              <DashboardEmptyState
                icon={
                  <PackageSearch className="h-7 w-7" strokeWidth={1.4} />
                }
                title="No contracts found"
                description="Try changing your search or status filter."
                buttonLabel="Clear filters"
                onButtonClick={handleClearFilters}
              />
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
                  getRowKey={(row) => row.id}
                  renderActions={renderRowActions}
                />
              </div>
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
    </DashboardLayout>
  );
}
