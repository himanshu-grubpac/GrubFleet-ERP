"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchWorkshopLaborJobCardApi,
  updateWorkshopLaborJobCardStatusApi,
} from "@/lib/api/workshop/labor-job-cards";
import { formatInrFromMinor } from "@/lib/format/money-format";
import { useWorkshopEntityId } from "@/lib/navigation/use-workshop-entity-id";
import {
  workshopLabourRateCardEditHref,
  workshopLabourRateCardListHref,
} from "@/lib/navigation/workshop-static-routes";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

export default function LaborJobCardViewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const cardId = useWorkshopEntityId("laborJobCardId");
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canUpdate =
    permissions.has("workshop.update") ||
    permissions.has("workshop.manage");

  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["workshop", "labor-job-card", organizationId, cardId],
    queryFn: () =>
      fetchWorkshopLaborJobCardApi(token!, organizationId!, cardId),
    enabled: !!token && !!organizationId && !!cardId && !isAuthLoading,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateWorkshopLaborJobCardStatusApi(
        token,
        cardId,
        organizationId,
        input.action,
        input.reason,
      );
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["workshop", "labor-job-cards"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["workshop", "labor-job-card", organizationId, cardId],
      });
      setActivateOpen(false);
      setDeactivateOpen(false);
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

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading labour rate card…
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-gray-500">
        <p>Could not load this labour rate card.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(workshopLabourRateCardListHref)}
        >
          Back to list
        </Button>
      </div>
    );
  }

  const detail = detailQuery.data;
  const isActive = detail.status === "active";

  return (
    <div className="min-h-full bg-gray-50 px-5 py-4">
      <button
        type="button"
        className="mb-4 text-sm text-[#FE5720] hover:underline"
        onClick={() => router.push(workshopLabourRateCardListHref)}
      >
        Back to labour rate cards
      </button>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900">{detail.name}</h1>
          <span
            className={
              isActive
                ? "rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
            }
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        {canUpdate ? (
          <div className="flex flex-wrap gap-2">
            {isActive ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  router.push(workshopLabourRateCardEditHref(cardId))
                }
              >
                Edit
              </Button>
            ) : null}
            {isActive ? (
              <Button
                type="button"
                onClick={() => setDeactivateOpen(true)}
                disabled={statusMutation.isPending}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setActivateOpen(true)}
                disabled={statusMutation.isPending}
              >
                Activate
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {detail.description ? (
        <p className="mb-4 text-sm text-gray-600">{detail.description}</p>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800">
        <p>
          <span className="font-medium text-gray-600">Labor charge:</span>{" "}
          {formatInrFromMinor(detail.laborChargeMinor)}
        </p>
        {detail.parts.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {detail.parts.map((line) => (
              <li key={line.partId}>
                {line.partName} × {line.quantity}
                {line.unitCostMinor != null &&
                  ` · ${formatInrFromMinor(line.unitCostMinor)} ea`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-gray-500">No parts on this labour job card.</p>
        )}
      </div>

      <ConfirmDialog
        open={activateOpen}
        title="Activate labour rate card?"
        message={`${detail.name} will be available for work orders.`}
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate({ action: "activate" })}
        onClose={() => setActivateOpen(false)}
      />

      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate labour rate card?"
        description={`${detail.name} will no longer be selectable on new work orders.`}
        confirmLabel="Deactivate"
        isPending={statusMutation.isPending}
        onConfirm={(reason) =>
          statusMutation.mutate({ action: "deactivate", reason })
        }
        onClose={() => setDeactivateOpen(false)}
      />
    </div>
  );
}
