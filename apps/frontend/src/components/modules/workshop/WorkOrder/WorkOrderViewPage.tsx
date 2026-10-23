"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkshopEntityId } from "@/lib/navigation/use-workshop-entity-id";
import { AlertCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateWorkOrderCaches } from "@/lib/query/invalidate-domain-caches";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchWorkshopWorkOrderApi,
  updateWorkshopWorkOrderStatusApi,
  type WorkshopWorkOrderDetail,
  type WorkshopWorkOrderStatus,
} from "@/lib/api/workshop/work-orders";
import { formatInrFromMinor } from "@/lib/format/money-format";
import {
  workshopWorkOrderEditHref,
  workshopWorkOrderListHref,
} from "@/lib/navigation/workshop-static-routes";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

function statusLabel(status: WorkshopWorkOrderStatus): string {
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

function statusBadgeClass(status: WorkshopWorkOrderStatus): string {
  switch (status) {
    case "open":
      return "bg-gray-100 text-gray-600";
    case "in_progress":
      return "bg-blue-50 text-blue-700";
    case "closed":
      return "bg-green-50 text-green-700";
    case "cancelled":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function WorkOrderViewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const workOrderId = useWorkshopEntityId("workOrderId");

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canUpdate =
    permissions.has("workshop.update") ||
    permissions.has("workshop.manage");

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["workshop", "work-order", organizationId, workOrderId],
    queryFn: () => {
      if (!token || !organizationId || !workOrderId) {
        throw new Error("Missing context");
      }
      return fetchWorkshopWorkOrderApi(token, organizationId, workOrderId);
    },
    enabled:
      !!token && !!organizationId && !!workOrderId && !isAuthLoading,
  });

  const statusMutation = useMutation({
    mutationFn: (action: "start" | "close" | "cancel") => {
      if (!token || !organizationId) {
        throw new Error("Missing auth");
      }
      return updateWorkshopWorkOrderStatusApi(token, workOrderId, {
        organizationId,
        action,
      });
    },
    onSuccess: (detail, action) => {
      void invalidateWorkOrderCaches(queryClient);
      if (action === "start") {
        showSuccessToast(`Work order ${detail.workOrderNumber} started`);
      } else if (action === "close") {
        showSuccessToast(`Work order ${detail.workOrderNumber} completed`);
      }
      setCompleteModalOpen(false);
      setStartModalOpen(false);
    },
    onError: (error: Error) => {
      showErrorToast(
        error instanceof ApiClientError
          ? error.message
          : "Could not update work order status.",
      );
    },
  });

  const workOrder = detailQuery.data;

  const availableActions = workOrder?.availableActions;
  const canEditHeader = availableActions?.edit ?? canUpdate;
  const canStart = availableActions?.start ?? false;
  const canComplete = availableActions?.complete ?? false;

  const workOrderTypeLabel =
    workOrder?.workOrderType === "pm"
      ? "PM"
      : workOrder?.workOrderType === "return_inspection"
        ? "Return inspection"
        : "General";

  const partsStatusLabel =
    workOrder?.partsFulfillmentSummary === "issued"
      ? "Issued"
      : workOrder?.partsFulfillmentSummary === "reserved"
        ? "Reserved"
        : workOrder?.partsFulfillmentSummary === "mixed"
          ? "Mixed"
          : null;

  const isClosed = workOrder?.status === "closed";
  const isCancelled = workOrder?.status === "cancelled";
  const isOpen = workOrder?.status === "open";
  const isInProgress = workOrder?.status === "in_progress";
  const terminal = isClosed || isCancelled;

  const workOrderKindLabel =
    workOrder?.workOrderType === "pm"
      ? "PM work order"
      : workOrder?.workOrderType === "return_inspection"
        ? "Return inspection work order"
        : "General work order";

  const subtitle = useMemo(() => {
    if (!workOrder?.vehicle) return "";
    const fleet = workOrder.vehicle.fleetCode;
    const cls = workOrder.vehicle.assetClassName;
    if (isClosed) return `${fleet} — ${cls}. ${workOrderKindLabel}, completed.`;
    if (isOpen)
      return `${fleet} — ${cls}. ${workOrderKindLabel} — not yet started.`;
    if (isInProgress)
      return `${fleet} — ${cls}. ${workOrderKindLabel} — in progress.`;
    return `${fleet} — ${cls}.`;
  }, [workOrder, isClosed, isOpen, isInProgress, workOrderKindLabel]);

  const statusBanner = workOrder?.statusBanner;
  const showStatusBanner =
    statusBanner &&
    !(terminal && statusBanner.level === "success");

  if (!workOrderId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Missing work order id.{" "}
        <button
          type="button"
          className="ml-1 text-[#FE5720] underline"
          onClick={() => router.push(workshopWorkOrderListHref)}
        >
          Back to list
        </button>
      </div>
    );
  }

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading work order…
      </div>
    );
  }

  if (detailQuery.isError || !workOrder) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-gray-600">
        <p>Could not load this work order.</p>
        <button
          type="button"
          className="text-[#FE5720] underline"
          onClick={() => void detailQuery.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 text-sm text-gray-700">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-3 sm:px-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[14px] font-semibold text-gray-900">
                {workOrder.workOrderNumber}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[14px] font-medium ${statusBadgeClass(workOrder.status)}`}
              >
                {statusLabel(workOrder.status)}
              </span>
              {workOrder.isOverdue && !terminal && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Overdue
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] leading-4 text-gray-500">
              {subtitle}
            </p>
            <p className="mt-1 text-[12px] text-gray-600">
              Type: {workOrderTypeLabel}
              {workOrder.sourceLabel
                ? ` · Source: ${workOrder.sourceLabel}`
                : null}
              {workOrder.maintenanceScheduleName
                ? ` · Schedule: ${workOrder.maintenanceScheduleName}`
                : null}
              {partsStatusLabel ? ` · Parts: ${partsStatusLabel}` : null}
            </p>
          </div>

          {!terminal && (canEditHeader || canStart || canComplete) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {(isInProgress || isOpen) && canEditHeader && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigateToEntityShell(router, workshopWorkOrderEditHref(workOrder.id), workOrder.id, 'push')
                  }
                  className="h-8 px-3 text-[12px] font-medium"
                >
                  Edit
                </Button>
              )}
              {isOpen && canStart && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setStartModalOpen(true)}
                  disabled={statusMutation.isPending}
                  className="h-8 px-3 text-[12px] font-medium"
                >
                  Start work order
                </Button>
              )}
              {isInProgress && canComplete && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setCompleteModalOpen(true)}
                  disabled={statusMutation.isPending}
                  className="h-8 px-3 text-[12px] font-medium"
                >
                  Mark as completed
                </Button>
              )}
            </div>
          )}
        </div>

        {showStatusBanner ? (
          <div
            className={`mb-3 flex gap-2 rounded-md border px-3 py-2 text-[12px] ${statusBanner.level === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : statusBanner.level === "success"
                  ? "border-green-200 bg-green-50 text-green-900"
                  : "border-blue-200 bg-blue-50 text-blue-900"
              }`}
            role="status"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{statusBanner.message}</p>
          </div>
        ) : null}

        <section className="mb-3">
          <SectionCard title={isClosed ? "COMPLETION" : "WORK ORDER"}>
            <InfoRow
              label="Vehicle"
              value={
                workOrder.vehicle
                  ? `${workOrder.vehicle.fleetCode} — ${workOrder.vehicle.assetClassName}`
                  : "—"
              }
            />
            <InfoRow
              label="Odometer reading"
              value={
                workOrder.odometerReading != null
                  ? `${workOrder.odometerReading.toLocaleString("en-IN")} km`
                  : workOrder.vehicle
                    ? `${workOrder.vehicle.odometer.toLocaleString("en-IN")} km`
                    : "—"
              }
            />
            <InfoRow label="Type" value={workOrderTypeLabel} />
            {workOrder.sourceLabel ? (
              <InfoRow label="Source" value={workOrder.sourceLabel} />
            ) : null}
            <InfoRow
              label="Reported issue"
              value={workOrder.issueDescription ?? "—"}
            />
            <InfoRow label="Reported by" value={workOrder.reportedBy ?? "—"} />
            <InfoRow
              label="Estimate"
              value={formatInrFromMinor(workOrder.netTotalMinor)}
            />
            {workOrder.expectedCompletionDate && (
              <InfoRow
                label="Expected completion"
                value={workOrder.expectedCompletionDate}
              />
            )}
            {isClosed && workOrder.closedAt ? (
              <InfoRow
                label="Completed on"
                value={new Date(workOrder.closedAt).toLocaleString("en-IN")}
              />
            ) : null}
          </SectionCard>
        </section>

        {!terminal && (
          <section className="mb-3">
            <SectionCard title="PERSONNEL">
              <InfoRow
                label="Assigned technician"
                value={workOrder.technicianName ?? "—"}
              />
            </SectionCard>
          </section>
        )}

        <section className="mb-3">
          <SectionCard title="WORK ORDER ITEMS">
            <TableHeader
              columns={["Description", "Source", "Cost"]}
              template="minmax(0,1fr) 20% 17%"
            />
            {workOrder.laborLines.length === 0 &&
              workOrder.partLines.length === 0 && (
                <p className="px-3 py-3 text-[14px] text-gray-400">
                  No labor or part lines recorded.
                </p>
              )}
            {workOrder.laborLines.map((line) => (
              <LineRow
                key={line.id}
                col1={line.description}
                col2={line.lineSource === "template" ? "Labour card" : "Additional"}
                col3={formatInrFromMinor(line.amountMinor)}
                template="minmax(0,1fr) 20% 17%"
              />
            ))}
            <div className="px-3 py-2">
              <p className="text-[12px] text-gray-400">
                Labor total: {formatInrFromMinor(workOrder.laborTotalMinor)}
              </p>
            </div>
          </SectionCard>
        </section>

        <section>
          <SectionCard title="PARTS & CONSUMABLES">
            <TableHeader
              columns={["Item", "Qty", "Status", "Line total"]}
              template="minmax(0,1fr) 15% 18% 22%"
            />
            {workOrder.partLines.map((line) => (
              <LineRow
                key={line.id}
                col1={line.partName}
                col2={String(line.quantity)}
                col3={
                  line.fulfillmentStatus === "issued"
                    ? "Issued"
                    : line.fulfillmentStatus === "cancelled"
                      ? "Cancelled"
                      : "Reserved"
                }
                col4={formatInrFromMinor(line.lineTotalMinor)}
                template="minmax(0,1fr) 15% 18% 22%"
              />
            ))}
            <div className="px-3 py-2">
              <p className="text-[12px] text-gray-400">
                Parts total: {formatInrFromMinor(workOrder.partsTotalMinor)} ·
                Net: {formatInrFromMinor(workOrder.netTotalMinor)}
              </p>
            </div>
          </SectionCard>
        </section>

        {!terminal && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[12px] leading-4 text-gray-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Parts and labor totals are computed from inventory cost snapshots
              and labor lines at work order creation.
            </span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={startModalOpen}
        title="Start work order?"
        message="This marks the work order as in progress."
        confirmLabel="Start"
        isConfirmPending={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate("start")}
        onClose={() => setStartModalOpen(false)}
      />

      <ConfirmDialog
        open={completeModalOpen}
        title="Mark work order as completed?"
        message={`Confirm completion for ${workOrder.workOrderNumber}. Final net total: ${formatInrFromMinor(workOrder.netTotalMinor)}.`}
        confirmLabel="Confirm completion"
        isConfirmPending={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate("close")}
        onClose={() => setCompleteModalOpen(false)}
      />
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="px-3 pt-3">
        <h2 className="text-[14px] font-semibold text-gray-400">{title}</h2>
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[25px] items-center gap-3 border-b border-gray-100 px-3 py-1 last:border-b-0">
      <p className="w-1/2 shrink-0 text-[14px] font-medium leading-5 text-gray-500">
        {label}
      </p>
      <p className="min-w-0 flex-1 break-words text-right text-[14px] font-semibold leading-5 text-gray-800">
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  columns,
  template,
}: {
  columns: string[];
  template: string;
}) {
  return (
    <div className="border-b border-gray-100 px-3 pb-2">
      <div className="grid gap-3" style={{ gridTemplateColumns: template }}>
        {columns.map((column) => (
          <p
            key={column}
            className="text-[14px] font-semibold uppercase text-gray-400"
          >
            {column}
          </p>
        ))}
      </div>
    </div>
  );
}

function LineRow({
  col1,
  col2,
  col3,
  col4,
  template,
}: {
  col1: string;
  col2: string;
  col3: string;
  col4?: string;
  template: string;
}) {
  return (
    <div
      className="grid gap-3 border-b border-gray-100 px-3 py-2.5 last:border-b-0"
      style={{ gridTemplateColumns: template }}
    >
      <p className="min-w-0 break-words text-[14px] leading-5 text-gray-700">
        {col1}
      </p>
      <p className="text-[14px] leading-5 text-gray-700">{col2}</p>
      <p className="text-[14px] leading-5 text-gray-700">{col3}</p>
      {col4 != null ? (
        <p className="text-[14px] leading-5 text-gray-700">{col4}</p>
      ) : null}
    </div>
  );
}
