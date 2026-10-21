
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";

import { useInventoryEntityId } from "@/lib/navigation/use-inventory-entity-id";
import { useAuth } from "@/providers/auth-provider";
import { fetchPartsRequestDetailApi } from "@/lib/api/inventory/parts-requests";

type RequestLifecycleStatus = "active" | "inactive";

export default function PartsViewPage() {
  const requestId = useInventoryEntityId("partsRequestId");
  const queryClient = useQueryClient();

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
  } = useAuth();

  const [lifecycleStatus, setLifecycleStatus] =
    useState<RequestLifecycleStatus>("active");

  const [showActivateDialog, setShowActivateDialog] =
    useState(false);

  const [showDeactivateDialog, setShowDeactivateDialog] =
    useState(false);

  const detailQuery = useQuery({
    queryKey: [
      "inventory",
      "parts-requests",
      organizationId,
      requestId,
    ],
    queryFn: () =>
      fetchPartsRequestDetailApi(
        organizationId!,
        requestId,
        token!,
      ),
    enabled:
      !!token &&
      !!organizationId &&
      !isAuthLoading &&
      !!requestId,
  });

  // Placeholder until the real lifecycle API is connected.
  const statusMutation = useMutation({
    mutationFn: async (input: {
      status: RequestLifecycleStatus;
      reason?: string;
    }) => input,

    onSuccess: (result) => {
      setLifecycleStatus(result.status);
      setShowActivateDialog(false);
      setShowDeactivateDialog(false);

      void queryClient.invalidateQueries({
        queryKey: [
          "inventory",
          "parts-requests",
          organizationId,
        ],
      });
    },
  });

  useEffect(() => {
    const apiStatus = detailQuery.data as
      | (NonNullable<typeof detailQuery.data> & {
        isActive?: boolean;
        lifecycleStatus?: string;
      })
      | undefined;

    if (apiStatus?.isActive !== undefined) {
      setLifecycleStatus(
        apiStatus.isActive ? "active" : "inactive",
      );
    } else if (
      apiStatus?.lifecycleStatus === "active" ||
      apiStatus?.lifecycleStatus === "inactive"
    ) {
      setLifecycleStatus(apiStatus.lifecycleStatus);
    }
  }, [detailQuery.data]);

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Loading request…
        </p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Parts request not found.
        </p>
      </div>
    );
  }

  const request = detailQuery.data;
  const isBlocked = request.status === "Blocked";
  const isFulfilled = request.status === "Fulfilled";
  const isActive = lifecycleStatus === "active";

  const handleActivate = () => {
    if (!isBlocked || statusMutation.isPending) return;

    statusMutation.mutate({
      status: "active",
    });
  };

  const handleDeactivate = (reason: string) => {
    if (
      !isBlocked ||
      statusMutation.isPending ||
      !reason.trim()
    ) {
      return;
    }

    statusMutation.mutate({
      status: "inactive",
      reason: reason.trim(),
    });
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {request.requestNumber}
              </h1>

              {/* Outcome status */}
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  isFulfilled
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600",
                ].join(" ")}
              >
                {request.status}
              </span>

              {/* Lifecycle status only for Blocked requests */}
              {isBlocked && (
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    isActive
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-600",
                  ].join(" ")}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Requested against {request.workOrder}.
            </p>
          </div>

          {/* Lifecycle action only for Blocked requests */}
          {isBlocked && (
            <Button
              type="button"
              variant="primary"
              className="h-9 shrink-0"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (isActive) {
                  setShowDeactivateDialog(true);
                } else {
                  setShowActivateDialog(true);
                }
              }}
            >
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>

        {/* Request details */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Request
          </h2>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <InfoRow
              label="Part"
              value={request.part}
            />

            <InfoRow
              label="Quantity requested"
              value={`${request.quantity} ${request.unit}`}
            />

            <InfoRow
              label="Location"
              value={request.location}
            />

            <InfoRow
              label="Type / Vehicle"
              value={`${request.requestType} — ${request.vehicle}`}
            />
          </div>
        </section>

        {/* Outcome */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Outcome
          </h2>

          <div
            className={[
              "rounded-lg border px-3 py-3",
              isFulfilled
                ? "border-green-200 bg-green-50"
                : "border-orange-200 bg-orange-50",
            ].join(" ")}
          >
            <p
              className={[
                "text-sm leading-5",
                isFulfilled
                  ? "text-green-700"
                  : "text-orange-800",
              ].join(" ")}
            >
              {isFulfilled
                ? "This request was fulfilled successfully. Stock has already been deducted."
                : "This request was blocked. The requested quantity was not deducted from stock."}
            </p>
          </div>
        </section>
      </div>

      {/* Activate confirmation */}
      <ConfirmDialog
        open={showActivateDialog && isBlocked}
        title="Activate this request?"
        message={`Are you sure you want to activate ${request.requestNumber}'s request for ${request.quantity} ${request.unit} of "${request.part}"? The request outcome will remain Blocked.`}
        confirmLabel="Activate"
        cancelLabel="Cancel"
        variant="default"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setShowActivateDialog(false);
          }
        }}
        onConfirm={handleActivate}
      />

      {/* Deactivate confirmation with required reason */}
      <ReasonRequiredDialog
        open={showDeactivateDialog && isBlocked}
        title="Deactivate this request?"
        description={
          <>
            This will deactivate the request{" "}
            <strong>{request.requestNumber}</strong>{" "}
            for{" "}
            <strong>
              {request.quantity} {request.unit}
            </strong>{" "}
            of <strong>{request.part}</strong>. The request
            will remain in the log, and its Blocked outcome
            will not change.
          </>
        }
        reasonLabel="Reason"
        reasonPlaceholder="Enter reason for deactivation..."
        confirmLabel="Deactivate"
        pendingLabel="Deactivating..."
        cancelLabel="Cancel"
        isPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setShowDeactivateDialog(false);
          }
        }}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[42px] items-center border-b border-gray-100 px-3 last:border-b-0">
      <p className="w-1/2 text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="w-1/2 text-right text-xs font-medium text-gray-900">
        {value}
      </p>
    </div>
  );
}
