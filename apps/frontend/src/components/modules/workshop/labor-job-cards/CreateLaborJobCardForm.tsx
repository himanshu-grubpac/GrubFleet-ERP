"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkshopEntityId } from "@/lib/navigation/use-workshop-entity-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";

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
import { invalidateLaborJobCardCaches } from "@/lib/query/invalidate-domain-caches";
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
  const queryClient = useQueryClient();
  const editCardId = useWorkshopEntityId("laborJobCardId");
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
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [partLines, setPartLines] = useState<
    Array<{ key: string; partId: string; name: string; quantity: number }>
  >([]);

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
      navigateToEntityShell(router, workshopLabourRateCardDetailHref(editCardId), editCardId, 'replace');
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
        key: line.partId,
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
        parts: partLines
          .filter((line) => line.partId)
          .map((line) => ({
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
      void invalidateLaborJobCardCaches(queryClient);
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

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Name is required.";
    }

    if (!laborCharge.trim()) {
      errors.laborCharge = "Labor charge is required.";
    } else if (laborChargeMinor == null) {
      errors.laborCharge = "Enter a valid labor charge.";
    } else if (laborChargeMinor < 0) {
      errors.laborCharge = "Labor charge cannot be negative.";
    }

    partLines.forEach((line) => {
      if (!line.partId) {
        errors[`part-${line.key}`] = "Select an inventory part or remove this row.";
      }
      if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
        errors[`quantity-${line.key}`] = "Quantity must be a whole number greater than zero.";
      }
    });

    return errors;
  }, [name, laborCharge, laborChargeMinor, partLines]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const canSubmit =
    (isEditMode ? canUpdate : canCreate) &&
    !isAuthLoading &&
    !saveMutation.isPending &&
    (!isEditMode || !existingQuery.isLoading) &&
    !hasValidationErrors;

  const handleSave = () => {
    setHasAttemptedSubmit(true);
    setFormError(null);

    if (hasValidationErrors) return;

    saveMutation.mutate();
  };

  const inputClassName =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";



  if (isEditMode && existingQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading labour rate card…
      </div>
    );
  }

  return (
    <OrganizationFormLayout
      title={isEditMode ? "Edit labour rate card" : "Add Service  Package card"}
      description="Save a Service Package card with optional inventory parts and labor charge."

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
              className={`${inputClassName} ${hasAttemptedSubmit && validationErrors.name ? "border-red-500" : ""}`}
              aria-invalid={hasAttemptedSubmit && !!validationErrors.name}
              aria-describedby={hasAttemptedSubmit && validationErrors.name ? "labor-job-card-name-error" : undefined}
            />
            {hasAttemptedSubmit && validationErrors.name && (
              <p id="labor-job-card-name-error" className="mt-1 text-xs text-red-600" role="alert">
                {validationErrors.name}
              </p>
            )}
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
              className={`${inputClassName} ${hasAttemptedSubmit && validationErrors.laborCharge ? "border-red-500" : ""}`}
              aria-invalid={hasAttemptedSubmit && !!validationErrors.laborCharge}
              aria-describedby={hasAttemptedSubmit && validationErrors.laborCharge ? "labor-job-card-charge-error" : undefined}
            />
            {hasAttemptedSubmit && validationErrors.laborCharge && (
              <p id="labor-job-card-charge-error" className="mt-1 text-xs text-red-600" role="alert">
                {validationErrors.laborCharge}
              </p>
            )}
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
            Parts Required (optional)
          </p>
          <div className="overflow-hidden rounded-md border border-gray-200">
            <div className="grid grid-cols-[minmax(0,1fr)_180px_72px] items-center gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700 sm:grid-cols-[minmax(0,1fr)_220px_80px]">
              <span>Inventory Part</span>
              <span>Quantity</span>
              <span className="text-center">Action</span>
            </div>

            {partLines.map((line) => (
              <div
                key={line.key}
                className="grid grid-cols-[minmax(0,1fr)_180px_72px] items-center gap-3 border-t border-gray-100 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_220px_80px]"
              >
                <select
                  value={line.partId}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    const selectedPart = partsCatalog.find(
                      (part) => part.id === selectedId,
                    );
                    setPartLines((prev) =>
                      prev.map((row) =>
                        row.key === line.key
                          ? {
                            ...row,
                            partId: selectedId,
                            name: selectedPart?.partName ?? "",
                          }
                          : row,
                      ),
                    );
                  }}
                  className={`h-10 min-w-0 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20 ${hasAttemptedSubmit && validationErrors[`part-${line.key}`] ? "border-red-500" : "border-gray-300"}`}
                  disabled={partsQuery.isLoading}
                  aria-label="Select inventory part"
                  aria-invalid={hasAttemptedSubmit && !!validationErrors[`part-${line.key}`]}
                >
                  <option value="">Select inventory part</option>
                  {partsCatalog
                    .filter(
                      (part: StockBalanceListItem) =>
                        part.id === line.partId ||
                        !partLines.some((row) => row.partId === part.id),
                    )
                    .map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.partName}
                      </option>
                    ))}
                </select>

                <div className="flex h-10 items-center overflow-hidden rounded-md border border-gray-200">
                  <button
                    type="button"
                    onClick={() =>
                      setPartLines((prev) =>
                        prev.map((row) =>
                          row.key === line.key
                            ? { ...row, quantity: Math.max(1, row.quantity - 1) }
                            : row,
                        ),
                      )
                    }
                    disabled={!line.partId || line.quantity <= 1}
                    className="flex h-full w-10 shrink-0 items-center justify-center bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="flex h-full min-w-0 flex-1 items-center justify-center border-x border-gray-200 text-sm font-medium text-gray-900">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPartLines((prev) =>
                        prev.map((row) =>
                          row.key === line.key
                            ? { ...row, quantity: row.quantity + 1 }
                            : row,
                        ),
                      )
                    }
                    disabled={!line.partId}
                    className="flex h-full w-10 shrink-0 items-center justify-center bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setPartLines((prev) =>
                        prev.filter((row) => row.key !== line.key),
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
                    aria-label="Remove part"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {hasAttemptedSubmit && validationErrors[`part-${line.key}`] && (
                  <p className="col-span-full -mt-1 text-xs text-red-600" role="alert">
                    {validationErrors[`part-${line.key}`]}
                  </p>
                )}
                {hasAttemptedSubmit && validationErrors[`quantity-${line.key}`] && (
                  <p className="col-span-full -mt-1 text-xs text-red-600" role="alert">
                    {validationErrors[`quantity-${line.key}`]}
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setPartLines((prev) => [
                ...prev,
                {
                  key: `new-${Date.now()}-${prev.length}`,
                  partId: "",
                  name: "",
                  quantity: 1,
                },
              ])
            }
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold text-[#FE5720] transition hover:bg-orange-50"
          >
            <Plus size={17} />
            Add another part
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
        <Button type="button" disabled={!canSubmit} onClick={handleSave}>
          {saveMutation.isPending ? "Saving…" : "Save rate card"}
        </Button>
      </div>
    </OrganizationFormLayout>
  );
}
