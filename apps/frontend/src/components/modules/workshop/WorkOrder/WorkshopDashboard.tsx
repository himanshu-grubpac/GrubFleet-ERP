"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateWorkOrderCaches } from "@/lib/query/invalidate-domain-caches";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardPagination from "@/components/dashboard/DashboardPagination";
import { DashboardRowActionsMenuItem } from "@/components/dashboard/DashboardRowActionsMenu";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchWorkshopWorkOrdersApi,
  updateWorkshopWorkOrderStatusApi,
  type WorkshopWorkOrderListItem,
  type WorkshopWorkOrderStatus,
} from "@/lib/api/workshop/work-orders";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import {
  sanitizeRestrictedInputValue,
  WORKSHOP_INPUT_LIMITS,
} from "@/lib/forms/restricted-input";
import {
  workshopWorkOrderCreateHref,
  workshopWorkOrderDetailHref,
  workshopWorkOrderEditHref,
} from "@/lib/navigation/workshop-static-routes";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { WORKSHOP_WORK_ORDER_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
import {
  listSortQueryKeyPart,
  useDashboardTableListSort,
} from "@/lib/query/dashboard-table-list-sort";
import { useAuth } from "@/providers/auth-provider";

type WorkOrderFilter =
  | "all"
  | "not-started"
  | "in-progress"
  | "completed"
  | "cancelled";

const PAGE_SIZE = 50;

const WORK_ORDER_FILTERS: { label: string; value: WorkOrderFilter }[] = [
  { label: "All", value: "all" },
  { label: "Not Started", value: "not-started" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function filterToApiStatus(
  filter: WorkOrderFilter,
): WorkshopWorkOrderStatus | undefined {
  switch (filter) {
    case "not-started":
      return "open";
    case "in-progress":
      return "in_progress";
    case "completed":
      return "closed";
    case "cancelled":
      return "cancelled";
    default:
      return undefined;
  }
}

function apiStatusLabel(status: WorkshopWorkOrderStatus): string {
  switch (status) {
    case "open":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "closed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function apiStatusClass(status: WorkshopWorkOrderStatus): string {
  switch (status) {
    case "open":
      return "bg-gray-100 text-gray-600";
    case "in_progress":
      return "bg-orange-50 text-orange-700";
    case "closed":
      return "bg-green-50 text-green-700";
    case "cancelled":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function WorkshopDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canUpdate =
    permissions.has("workshop.update") ||
    permissions.has("workshop.manage");

  const { searchInput, setSearchInput, debouncedSearch } =
    useDashboardListSearch();

  const onWorkOrderListSearchChange = useCallback(
    (value: string) => {
      setSearchInput(
        sanitizeRestrictedInputValue("text", value, {
          maxLength: WORKSHOP_INPUT_LIMITS.workOrderListSearch,
        }),
      );
    },
    [setSearchInput],
  );

  const [cancelTarget, setCancelTarget] =
    useState<WorkshopWorkOrderListItem | null>(null);
  const [activeFilter, setActiveFilter] =
    useState<WorkOrderFilter>("all");
  const [page, setPage] = useState(1);

  const {
    sort: tableSort,
    onSortChange,
    listSortParams,
    serverSorted,
  } = useDashboardTableListSort(WORKSHOP_WORK_ORDER_COLUMN_SORT);

  // Reset pagination when search, status filter, or sorting changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter, tableSort]);

  const listQuery = useQuery({
    queryKey: [
      "workshop",
      "work-orders",
      organizationId,
      debouncedSearch,
      activeFilter,
      page,
      ...listSortQueryKeyPart(listSortParams),
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }

      return fetchWorkshopWorkOrdersApi(token, {
        organizationId,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: filterToApiStatus(activeFilter),
        ...listSortParams,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const cancelMutation = useMutation({
    mutationFn: async (workOrderId: string) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }

      return updateWorkshopWorkOrderStatusApi(token, workOrderId, {
        organizationId,
        action: "cancel",
      });
    },
    onSuccess: (detail) => {
      void invalidateWorkOrderCaches(queryClient);

      setCancelTarget(null);
      showSuccessToast(
        `Work order ${detail.workOrderNumber} was cancelled`,
      );
    },
    onError: (error: Error) => {
      showErrorToast(
        error instanceof ApiClientError
          ? error.message
          : "Could not cancel work order.",
      );
    },
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const isInitialLoading =
    isAuthLoading || (listQuery.isLoading && !listQuery.data);

  const handleCreateWorkOrder = () => {
    router.push(workshopWorkOrderCreateHref);
  };

  const workOrderColumns = useMemo(
    () => [
      {
        key: "workOrderNumber",
        label: "WORK ORDER",
        render: (workOrder: WorkshopWorkOrderListItem) => (
          <button
            type="button"
            onClick={() =>
              router.push(workshopWorkOrderDetailHref(workOrder.id))
            }
            className="font-medium text-gray-900 hover:text-[#FE5720]"
          >
            {workOrder.workOrderNumber}
          </button>
        ),
      },
      {
        key: "vehicle",
        label: "VEHICLE",
        sortable: false,
        render: (workOrder: WorkshopWorkOrderListItem) => (
          <div>
            <p className="text-gray-700">
              {workOrder.vehicleFleetCode ?? "—"}
            </p>
            <p className="text-[11px] text-gray-400">
              {workOrder.vehicleAssetClassName ?? "—"}
            </p>
          </div>
        ),
      },
      {
        key: "type",
        label: "TYPE",
        sortable: false,
        render: () => "General",
      },
      {
        key: "source",
        label: "SOURCE",
        sortable: false,
        render: () => "Manual",
      },
      {
        key: "technician",
        label: "TECHNICIAN",
        sortable: false,
        render: (workOrder: WorkshopWorkOrderListItem) =>
          workOrder.technicianName ?? "—",
      },
      {
        key: "status",
        label: "STATUS",
        render: (workOrder: WorkshopWorkOrderListItem) => (
          <span
            className={[
              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
              apiStatusClass(workOrder.status),
            ].join(" ")}
          >
            {apiStatusLabel(workOrder.status)}
          </span>
        ),
      },
    ],
    [router],
  );

  const handleClearFilters = () => {
    setSearchInput("");
    setActiveFilter("all");
  };

  return (
    <DashboardLayout
      title="Work Orders"
      description="Manage workshop work orders, repairs, maintenance and parts usage."
      activeTab="/workshop/work-order"
      action={
        <Button type="button" onClick={handleCreateWorkOrder}>
          + Create Work Order
        </Button>
      }
    >
      {listQuery.isError && (
        <div
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          Could not load work orders.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => void listQuery.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            strokeWidth={1.8}
          />

          <input
            type="search"
            value={searchInput}
            maxLength={WORKSHOP_INPUT_LIMITS.workOrderListSearch}
            onChange={(event) =>
              onWorkOrderListSearchChange(event.target.value)
            }
            placeholder="Search by work order, vehicle or technician"
            className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {WORK_ORDER_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={[
                  "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                  isActive
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {isInitialLoading ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
          Loading work orders…
        </div>
      ) : total === 0 &&
        !debouncedSearch.trim() &&
        activeFilter === "all" ? (
        <DashboardEmptyState
          icon={<ClipboardList className="h-7 w-7" strokeWidth={1.4} />}
          title="No work orders yet"
          description="Create your first work order to start managing workshop work."
          buttonLabel="Create Work Order"
          onButtonClick={handleCreateWorkOrder}
        />
      ) : items.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
          <ClipboardList
            className="mb-3 h-7 w-7 text-gray-400"
            strokeWidth={1.4}
          />

          <h3 className="text-sm font-semibold text-gray-900">
            No work orders found
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Try changing your search or filters.
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
          <DashboardTable
            columns={workOrderColumns}
            data={items}
            getRowKey={(workOrder) => workOrder.id}
            sortState={tableSort}
            onSortChange={onSortChange}
            serverSorted={serverSorted}
            renderActions={(workOrder) => {
              const isTerminal =
                workOrder.status === "closed" ||
                workOrder.status === "cancelled";

              const canCancel =
                canUpdate &&
                (workOrder.status === "open" ||
                  workOrder.status === "in_progress");

              return (
                <DashboardTableActions
                  status={isTerminal ? "inactive" : "active"}
                  locationId={workOrder.id}
                  viewHref={workshopWorkOrderDetailHref(workOrder.id)}
                  copyText={[
                    `Work Order ID: ${workOrder.id}`,
                    `Work Order Number: ${workOrder.workOrderNumber}`,
                    `Vehicle Fleet Code: ${workOrder.vehicleFleetCode ?? "—"}`,
                    `Asset Class: ${workOrder.vehicleAssetClassName ?? "—"}`,
                    "Type: General",
                    "Source: Manual",
                    `Technician: ${workOrder.technicianName ?? "—"}`,
                    `Status: ${apiStatusLabel(workOrder.status)}`,
                  ].join("\n")}
                  overflowMenuDisabled={isTerminal}
                  alwaysShowOverflowMenu={canCancel}
                  onEdit={
                    !isTerminal
                      ? () =>
                        router.push(
                          workshopWorkOrderEditHref(workOrder.id),
                        )
                      : undefined
                  }
                  renderAdditionalMenuItems={() =>
                    canCancel ? (
                      <DashboardRowActionsMenuItem
                        label="Cancel work order"
                        className="text-red-600"
                        onSelect={() => setCancelTarget(workOrder)}
                      />
                    ) : null
                  }
                />
              );
            }}
          />

          <DashboardPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            disabled={listQuery.isFetching}
          />
        </>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel work order?"
        message={
          cancelTarget
            ? `${cancelTarget.workOrderNumber} will be marked cancelled.`
            : ""
        }
        confirmLabel="Cancel work order"
        variant="destructive"
        isConfirmPending={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelTarget) {
            cancelMutation.mutate(cancelTarget.id);
          }
        }}
        onClose={() => setCancelTarget(null)}
      />
    </DashboardLayout>
  );
}
