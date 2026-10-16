"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchWorkshopLaborJobCardsApi,
  updateWorkshopLaborJobCardStatusApi,
  type WorkshopLaborJobCardListItem,
} from "@/lib/api/workshop/labor-job-cards";
import {
  workshopLabourRateCardCreateHref,
  workshopLabourRateCardDetailHref,
  workshopLabourRateCardEditHref,
} from "@/lib/navigation/workshop-static-routes";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { formatInrFromMinor } from "@/lib/format/money-format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useAuth } from "@/providers/auth-provider";

const PAGE_SIZE = 20;

export default function LaborJobCardsListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canCreate =
    permissions.has("workshop.create") ||
    permissions.has("workshop.manage");
  const canUpdate =
    permissions.has("workshop.update") ||
    permissions.has("workshop.manage");

  const [activateTarget, setActivateTarget] =
    useState<WorkshopLaborJobCardListItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<WorkshopLaborJobCardListItem | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const listQuery = useQuery({
    queryKey: [
      "workshop",
      "labor-job-cards",
      organizationId,
      debouncedSearch,
      page,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchWorkshopLaborJobCardsApi(token, {
        organizationId,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isInitialLoading =
    isAuthLoading || (listQuery.isLoading && !listQuery.data);

  const statusMutation = useMutation({
    mutationFn: async (input: {
      card: WorkshopLaborJobCardListItem;
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateWorkshopLaborJobCardStatusApi(
        token,
        input.card.id,
        organizationId,
        input.action,
        input.reason,
      );
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["workshop", "labor-job-cards"],
      });
      setActivateTarget(null);
      setDeactivateTarget(null);
      showSuccessToast(
        variables.action === "activate"
          ? `${data.name} was activated`
          : `${data.name} was deactivated`,
      );
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not update status. Try again.";
      showErrorToast(message);
    },
  });

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "NAME",
        render: (row: WorkshopLaborJobCardListItem) => (
          <span className="font-medium text-gray-900">{row.name}</span>
        ),
      },
      {
        key: "laborChargeMinor",
        label: "LABOR CHARGE",
        render: (row: WorkshopLaborJobCardListItem) =>
          formatInrFromMinor(row.laborChargeMinor),
      },
      {
        key: "status",
        label: "STATUS",
        render: (row: WorkshopLaborJobCardListItem) =>
          row.status === "active" ? (
            <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              Active
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Inactive
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout
      title="Labour rate cards"
      description="Labor job cards with parts and labor charges for work orders."
      action={
        canCreate ? (
          <Button
            type="button"
            onClick={() => router.push(workshopLabourRateCardCreateHref)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add rate card
          </Button>
        ) : undefined
      }
      pagination={
        total > PAGE_SIZE
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
            className="h-10 w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
          />
        </div>
      </div>

      {listQuery.isError && (
        <div
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          Could not load labour rate cards.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => void listQuery.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {isInitialLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Loading labour rate cards…
        </div>
      ) : items.length === 0 ? (
        <DashboardEmptyState
          icon={
            <FileText className="h-7 w-7" strokeWidth={1.4} />
          }
          title="No labour rate cards yet"
          description={
            canCreate
              ? "Create a labour job card to reuse parts and labor on work orders."
              : "No active labour cards are available for this organization."
          }
        />
      ) : (
        <DashboardTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
          renderActions={(row) => (
            <DashboardTableActions
              status={row.status}
              locationId={row.id}
              viewHref={workshopLabourRateCardDetailHref(row.id)}
              onEdit={
                canUpdate && row.status === "active"
                  ? () => router.push(workshopLabourRateCardEditHref(row.id))
                  : undefined
              }
              onToggleStatus={
                canUpdate
                  ? () =>
                      row.status === "active"
                        ? setDeactivateTarget(row)
                        : setActivateTarget(row)
                  : undefined
              }
            />
          )}
        />
      )}

      <ConfirmDialog
        open={activateTarget !== null}
        title="Activate labour rate card?"
        message={
          activateTarget
            ? `${activateTarget.name} will be available for work orders.`
            : ""
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onConfirm={() => {
          if (activateTarget) {
            statusMutation.mutate({
              card: activateTarget,
              action: "activate",
            });
          }
        }}
        onClose={() => setActivateTarget(null)}
      />

      <ReasonRequiredDialog
        open={deactivateTarget !== null}
        title="Deactivate labour rate card?"
        description={
          deactivateTarget
            ? `${deactivateTarget.name} will no longer be selectable on new work orders.`
            : ""
        }
        confirmLabel="Deactivate"
        isPending={statusMutation.isPending}
        onConfirm={(reason) => {
          if (deactivateTarget) {
            statusMutation.mutate({
              card: deactivateTarget,
              action: "deactivate",
              reason,
            });
          }
        }}
        onClose={() => setDeactivateTarget(null)}
      />
    </DashboardLayout>
  );
}
