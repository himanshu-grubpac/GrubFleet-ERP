"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
  fetchAllStockBalanceListApi,
  type StockBalanceListItem,
} from "@/lib/api/inventory/stock-balance";
import {
  createWorkshopLaborJobCardApi,
  fetchWorkshopLaborJobCardApi,
  updateWorkshopLaborJobCardApi,
} from "@/lib/api/workshop/labor-job-cards";
import {
  workshopLabourRateCardDetailHref,
  workshopLabourRateCardListHref,
} from "@/lib/navigation/workshop-static-routes";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { ApiClientError } from "@/lib/api/client";
import {
  formatInrMajorUnits,
  formatRupeeInputDisplay,
  parseRupeeInputToMinor,
} from "@/lib/format/money-format";
import { WORKSHOP_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

export default function CreateLaborJobCardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editCardId = searchParams.get("laborJobCardId")?.trim() ?? "";
  const isEditMode = editCardId.length > 0;
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [laborCharge, setLaborCharge] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [partLines, setPartLines] = useState<
    Array<{ partId: string; name: string; quantity: number }>
  >([]);
  const [pickerPartId, setPickerPartId] = useState("");

  const existingQuery = useQuery({
    queryKey: ["workshop", "labor-job-card-edit", organizationId, editCardId],
    queryFn: () =>
      fetchWorkshopLaborJobCardApi(token!, organizationId!, editCardId),
    enabled:
      !!token && !!organizationId && !isAuthLoading && isEditMode,
  });

  useEffect(() => {
    const detail = existingQuery.data;
    if (!detail || !isEditMode) return;
    if (detail.status === "inactive") {
      router.replace(workshopLabourRateCardDetailHref(editCardId));
      return;
    }
    setName(detail.name);
    setDescription(detail.description ?? "");
    setLaborCharge(
      formatInrMajorUnits(detail.laborChargeMinor / 100, {
        maximumFractionDigits: 2,
      }),
    );
    setPartLines(
      detail.parts.map((line) => ({
        partId: line.partId,
        name: line.partName,
        quantity: line.quantity,
      })),
    );
  }, [existingQuery.data, isEditMode, editCardId, router]);

  const partsQuery = useQuery({
    queryKey: ["workshop", "labor-job-card-parts", organizationId],
    queryFn: () => fetchAllStockBalanceListApi(organizationId!, token!),
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardCatalogQueryOptions,
  });

  const partsCatalog = partsQuery.data ?? [];

  const laborChargeMinor = parseRupeeInputToMinor(laborCharge);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      if (laborChargeMinor == null) {
        throw new Error("Invalid labor charge");
      }
      const payload = {
        organizationId,
        name: name.trim(),
        description: description.trim() || undefined,
        laborChargeMinor,
        parts: partLines.map((line) => ({
          partId: line.partId,
          quantity: line.quantity,
        })),
      };
      if (isEditMode) {
        return updateWorkshopLaborJobCardApi(token, editCardId, payload);
      }
      return createWorkshopLaborJobCardApi(token, payload);
    },
    onSuccess: (detail) => {
      showSuccessToast(
        isEditMode ? `${detail.name} was updated` : `${detail.name} was added`,
      );
      router.push(
        isEditMode
          ? workshopLabourRateCardDetailHref(detail.id)
          : workshopLabourRateCardListHref,
      );
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not save labour rate card. Try again.";
      setFormError(message);
      showErrorToast(message);
    },
  });

  const isFormValid =
    name.trim().length > 0 &&
    laborChargeMinor != null &&
    laborChargeMinor >= 0;

  const canSubmit =
    (isEditMode ? canUpdate : canCreate) &&
    isFormValid &&
    !isAuthLoading &&
    !saveMutation.isPending &&
    (!isEditMode || !existingQuery.isLoading);

  const inputClassName =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

  const backLink = useMemo(
    () => ({
      label: isEditMode ? "Back to rate card" : "Back to labour rate cards",
      href: isEditMode
        ? workshopLabourRateCardDetailHref(editCardId)
        : workshopLabourRateCardListHref,
    }),
    [editCardId, isEditMode],
  );

  if (isEditMode && existingQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading labour rate card…
      </div>
    );
  }

  return (
    <OrganizationFormLayout
      title={isEditMode ? "Edit labour rate card" : "Add labour rate card"}
      description="Save a labor job card with optional inventory parts and labor charge."
      backLink={backLink}
    >
      {formError && (
        <div
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {formError}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="labor-job-card-name"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <RestrictedInput
              id="labor-job-card-name"
              restrictedKind="name"
              maxLength={WORKSHOP_INPUT_LIMITS.laborJobCardName}
              value={name}
              onChange={(value) => setName(value)}
              placeholder="e.g. General diagnostic & repair"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="labor-job-card-charge"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Labor charge (INR) <span className="text-red-500">*</span>
            </label>
            <RestrictedInput
              id="labor-job-card-charge"
              restrictedKind="inrRupee"
              value={laborCharge}
              onChange={(value) =>
                setLaborCharge(formatRupeeInputDisplay(value))
              }
              placeholder="0"
              className={inputClassName}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="labor-job-card-description"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Description{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <RestrictedInput
              id="labor-job-card-description"
              restrictedKind="text"
              maxLength={WORKSHOP_INPUT_LIMITS.laborJobCardDescription}
              value={description}
              onChange={(value) => setDescription(value)}
              placeholder="What this labour job card covers"
              className={inputClassName}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Parts on labour job card
          </p>
          {partLines.map((line) => (
            <div
              key={line.partId}
              className="mb-2 flex items-center justify-between text-sm text-gray-800"
            >
              <span>
                {line.name} × {line.quantity}
              </span>
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-red-600"
                onClick={() =>
                  setPartLines((prev) =>
                    prev.filter((row) => row.partId !== line.partId),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={pickerPartId}
              onChange={(event) => setPickerPartId(event.target.value)}
              className="h-9 min-w-[200px] flex-1 rounded-md border border-gray-300 px-3 text-sm"
              disabled={partsQuery.isLoading}
            >
              <option value="">Select inventory part</option>
              {partsCatalog
                .filter(
                  (part: StockBalanceListItem) =>
                    !partLines.some((line) => line.partId === part.id),
                )
                .map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.partName}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              disabled={!pickerPartId}
              onClick={() => {
                const part = partsCatalog.find((row) => row.id === pickerPartId);
                if (!part) return;
                setPartLines((prev) => [
                  ...prev,
                  {
                    partId: part.id,
                    name: part.partName,
                    quantity: 1,
                  },
                ]);
                setPickerPartId("");
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add part
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" disabled={!canSubmit} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "Saving…" : "Save rate card"}
        </Button>
      </div>
    </OrganizationFormLayout>
  );
}
