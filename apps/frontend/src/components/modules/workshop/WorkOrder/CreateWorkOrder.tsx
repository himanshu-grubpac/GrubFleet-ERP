"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Minus, Trash2, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import FormActions from "@/components/common/FormActions";
import {
  validateRequired,
  validateNumber,
  validateDate,
  hasValidationErrors,
  type ValidationErrors,
} from "@/components/common/Commonvalidation";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { WORKSHOP_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { fetchAllActiveAssetRegisterVehiclesApi } from "@/lib/api/asset-register/vehicles";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchAllStockBalanceListApi,
  type StockBalanceListItem,
} from "@/lib/api/inventory/stock-balance";
import {
  fetchAllWorkshopLaborJobCardsApi,
  fetchWorkshopLaborJobCardApi,
} from "@/lib/api/workshop/labor-job-cards";
import { fetchAllWorkshopTechniciansApi } from "@/lib/api/workshop/technicians";
import {
  createWorkshopWorkOrderApi,
  fetchWorkshopWorkOrderApi,
  updateWorkshopWorkOrderApi,
} from "@/lib/api/workshop/work-orders";
import {
  formatInrFromMinor,
  formatRupeeInputDisplay,
  parseRupeeInputToMinor,
} from "@/lib/format/money-format";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import {
  workshopWorkOrderDetailHref,
  workshopWorkOrderListHref,
} from "@/lib/navigation/workshop-static-routes";
import { useAuth } from "@/providers/auth-provider";

type AdditionalPartRow = {
  partId: string;
  name: string;
  quantity: number;
  unitCostMinor: number;
  onHand: number;
};

type AdditionalLaborRow = {
  key: string;
  description: string;
  amountInput: string;
};

function stockOnHand(item: StockBalanceListItem): number {
  return item.locations.reduce((sum, row) => sum + row.quantity, 0);
}

/** Keep native date inputs limited to real YYYY-MM-DD dates. */
function normalizeDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const candidate = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return "";
  const [year, month, day] = candidate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return candidate;
}

export default function WorkForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editWorkOrderId = searchParams.get("workOrderId")?.trim() ?? "";
  const isEditMode = editWorkOrderId.length > 0;

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canSave =
    permissions.has("workshop.create") ||
    permissions.has("workshop.update") ||
    permissions.has("workshop.manage");

  const canViewInventoryParts =
    permissions.has("inventory.view") || permissions.has("inventory.manage");

  const [vehicleId, setVehicleId] = useState("");
  const [laborJobCardId, setLaborJobCardId] = useState("");
  const [technicianEmployeeId, setTechnicianEmployeeId] = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [odometerReading, setOdometerReading] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [additionalParts, setAdditionalParts] = useState<AdditionalPartRow[]>(
    [],
  );
  const [additionalLabor, setAdditionalLabor] = useState<AdditionalLaborRow[]>(
    [],
  );
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [isAddingLabor, setIsAddingLabor] = useState(false);
  const [newLaborDescription, setNewLaborDescription] = useState("");
  const [newLaborAmount, setNewLaborAmount] = useState("");

  const catalogEnabled = !!token && !!organizationId && !isAuthLoading;

  const existingQuery = useQuery({
    queryKey: ["workshop", "work-order-edit", organizationId, editWorkOrderId],
    queryFn: () =>
      fetchWorkshopWorkOrderApi(token!, organizationId!, editWorkOrderId),
    enabled: catalogEnabled && isEditMode,
  });

  useEffect(() => {
    const detail = existingQuery.data;
    if (!detail || !isEditMode) return;
    setVehicleId(detail.vehicle?.id ?? "");
    setLaborJobCardId(detail.laborJobCardId ?? "");
    setTechnicianEmployeeId(detail.technicianEmployeeId ?? "");
    setExpectedCompletionDate(normalizeDateInput(detail.expectedCompletionDate));
    setReportedBy(detail.reportedBy ?? "");
    setOdometerReading(
      detail.odometerReading != null ? String(detail.odometerReading) : "",
    );
    setIssueDescription(detail.issueDescription ?? "");
    setNotes(detail.notes ?? "");
  }, [existingQuery.data, isEditMode]);

  const vehiclesQuery = useQuery({
    queryKey: ["workshop", "create-work-order-vehicles", organizationId],
    queryFn: () =>
      fetchAllActiveAssetRegisterVehiclesApi({
        token: token!,
        organizationId: organizationId!,
      }),
    enabled: catalogEnabled && !isEditMode,
    ...dashboardCatalogQueryOptions,
  });

  const laborJobCardsQuery = useQuery({
    queryKey: ["workshop", "create-work-order-job-cards", organizationId],
    queryFn: () =>
      fetchAllWorkshopLaborJobCardsApi(token!, {
        organizationId: organizationId!,
        status: "active",
      }),
    enabled: catalogEnabled && !isEditMode,
    ...dashboardCatalogQueryOptions,
  });

  const laborJobCardDetailQuery = useQuery({
    queryKey: [
      "workshop",
      "labor-job-card-detail",
      organizationId,
      laborJobCardId,
    ],
    queryFn: () =>
      fetchWorkshopLaborJobCardApi(token!, organizationId!, laborJobCardId),
    enabled: catalogEnabled && !!laborJobCardId && !isEditMode,
    ...dashboardCatalogQueryOptions,
  });

  const partsCatalogQuery = useQuery({
    queryKey: ["workshop", "inventory-parts-picker", organizationId],
    queryFn: () =>
      fetchAllStockBalanceListApi(organizationId!, token!),
    enabled:
      catalogEnabled &&
      canViewInventoryParts &&
      ((isEditMode && canSave) || (!isEditMode && !!vehicleId)),
    ...dashboardCatalogQueryOptions,
  });

  const techniciansQuery = useQuery({
    queryKey: ["workshop", "technicians-all", organizationId],
    queryFn: () =>
      fetchAllWorkshopTechniciansApi(token!, organizationId!),
    enabled: catalogEnabled,
    ...dashboardCatalogQueryOptions,
  });

  const vehicles = vehiclesQuery.data ?? [];
  const laborJobCards = laborJobCardsQuery.data ?? [];
  const partsCatalog = partsCatalogQuery.data ?? [];
  const technicians = techniciansQuery.data ?? [];

  const selectedVehicle = useMemo(() => {
    if (isEditMode && existingQuery.data?.vehicle) {
      return existingQuery.data.vehicle;
    }
    return vehicles.find((vehicle) => vehicle.id === vehicleId);
  }, [vehicles, vehicleId, isEditMode, existingQuery.data]);

  const templateParts = laborJobCardDetailQuery.data?.parts ?? [];
  const templateLaborMinor =
    laborJobCardDetailQuery.data?.laborChargeMinor ?? 0;

  const additionalPartsCost = additionalParts.reduce(
    (sum, line) => sum + line.quantity * line.unitCostMinor,
    0,
  );
  const templatePartsCost = templateParts.reduce(
    (sum, line) => sum + line.quantity * (line.unitCostMinor ?? 0),
    0,
  );
  const additionalLaborMinor = additionalLabor.reduce((sum, line) => {
    const minor = parseRupeeInputToMinor(line.amountInput);
    return sum + (minor ?? 0);
  }, 0);
  const estimatedMinor =
    templatePartsCost +
    templateLaborMinor +
    additionalPartsCost +
    additionalLaborMinor;

  const selectableParts = partsCatalog.filter(
    (part) => !additionalParts.some((row) => row.partId === part.id),
  );

  const validationErrors: ValidationErrors = useMemo(() => {
    const errors: ValidationErrors = {};

    if (!isEditMode) {
      const vehicleError = validateRequired(vehicleId, "Fleet vehicle");
      if (vehicleError) errors.vehicleId = vehicleError;
    }

    if (reportedBy.trim()) {
      const reportedByError = validateRequired(reportedBy, "Reported by name");
      if (reportedByError) errors.reportedBy = reportedByError;
      if (reportedBy.trim().length > WORKSHOP_INPUT_LIMITS.workOrderReportedBy) {
        errors.reportedBy = `Reported by name must not exceed ${WORKSHOP_INPUT_LIMITS.workOrderReportedBy} characters.`;
      }
    }

    if (odometerReading.trim()) {
      const odometerError = validateNumber(odometerReading, {
        label: "Odometer reading",
        required: false,
        min: 0,
        integer: true,
      });
      if (odometerError) errors.odometerReading = odometerError;
    }

    if (expectedCompletionDate) {
      const dateError = validateDate(expectedCompletionDate, {
        label: "Expected completion date",
        required: false,
      });
      if (dateError) errors.expectedCompletionDate = dateError;
    }

    if (isAddingPart) {
      const partError = validateRequired(selectedPartId, "Inventory part");
      if (partError) errors.selectedPartId = partError;
    }

    if (isAddingLabor) {
      const descriptionError = validateRequired(newLaborDescription, "Labor description");
      if (descriptionError) errors.newLaborDescription = descriptionError;

      const amountError = validateRequired(newLaborAmount, "Labor amount");
      if (amountError) {
        errors.newLaborAmount = amountError;
      } else {
        const amountMinor = parseRupeeInputToMinor(newLaborAmount);
        if (amountMinor == null || amountMinor < 0) {
          errors.newLaborAmount = "Enter a valid labor amount greater than or equal to zero.";
        }
      }
    }

    return errors;
  }, [
    isEditMode,
    vehicleId,
    reportedBy,
    odometerReading,
    expectedCompletionDate,
    isAddingPart,
    selectedPartId,
    isAddingLabor,
    newLaborDescription,
    newLaborAmount,
  ]);

  const validationSummary = useMemo(
    () => Object.values(validationErrors).filter(Boolean) as string[],
    [validationErrors],
  );

  const isCoreFormValid = useMemo(() => {
    const inlineAddKeys = new Set([
      "selectedPartId",
      "newLaborDescription",
      "newLaborAmount",
    ]);
    return !Object.entries(validationErrors).some(
      ([key, message]) => message && !inlineAddKeys.has(key),
    );
  }, [validationErrors]);

  const getFieldError = (field: string) =>
    hasAttemptedSubmit ? validationErrors[field] : undefined;

  const handleSave = () => {
    // Block rapid repeated clicks before React has time to re-render.
    if (isSubmittingRef.current || saveMutation.isPending) return;

    setHasAttemptedSubmit(true);
    setSubmitError(null);

    if (hasValidationErrors(validationErrors)) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    saveMutation.mutate();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      const odometerParsed = odometerReading.trim()
        ? Number.parseInt(odometerReading.trim(), 10)
        : undefined;

      if (isEditMode) {
        const additionalLaborPayload = additionalLabor
          .map((line) => {
            const amountMinor = parseRupeeInputToMinor(line.amountInput);
            if (!line.description.trim() || amountMinor == null) return null;
            return {
              description: line.description.trim(),
              amountMinor,
            };
          })
          .filter(Boolean) as Array<{
            description: string;
            amountMinor: number;
          }>;

        return updateWorkshopWorkOrderApi(token, editWorkOrderId, {
          organizationId,
          technicianEmployeeId: technicianEmployeeId || null,
          expectedCompletionDate: expectedCompletionDate || null,
          reportedBy: reportedBy.trim() || null,
          odometerReading:
            odometerParsed != null && !Number.isNaN(odometerParsed)
              ? odometerParsed
              : null,
          issueDescription: issueDescription.trim() || null,
          notes: notes.trim() || null,
          ...(additionalParts.length > 0
            ? {
              additionalParts: additionalParts.map((line) => ({
                partId: line.partId,
                quantity: line.quantity,
              })),
            }
            : {}),
          ...(additionalLaborPayload.length > 0
            ? { additionalLabor: additionalLaborPayload }
            : {}),
        });
      }

      if (!vehicleId) {
        throw new Error("Select a fleet vehicle");
      }

      return createWorkshopWorkOrderApi(token, {
        organizationId,
        vehicleId,
        laborJobCardId: laborJobCardId || undefined,
        technicianEmployeeId: technicianEmployeeId || undefined,
        expectedCompletionDate: expectedCompletionDate || undefined,
        reportedBy: reportedBy.trim() || undefined,
        odometerReading:
          odometerParsed != null && !Number.isNaN(odometerParsed)
            ? odometerParsed
            : undefined,
        issueDescription: issueDescription.trim() || undefined,
        notes: notes.trim() || undefined,
        additionalParts: additionalParts.map((line) => ({
          partId: line.partId,
          quantity: line.quantity,
        })),
        additionalLabor: additionalLabor
          .map((line) => {
            const amountMinor = parseRupeeInputToMinor(line.amountInput);
            if (!line.description.trim() || amountMinor == null) return null;
            return {
              description: line.description.trim(),
              amountMinor,
            };
          })
          .filter(Boolean) as Array<{
            description: string;
            amountMinor: number;
          }>,
      });
    },
    onSuccess: (detail) => {
      showSuccessToast(
        isEditMode
          ? `Work order ${detail.workOrderNumber} was updated`
          : `Work order ${detail.workOrderNumber} was created`,
      );
      router.push(workshopWorkOrderDetailHref(detail.id));
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not save work order. Try again.";
      setSubmitError(message);
      showErrorToast(message);
    },
    onSettled: () => {
      // Re-enable the button after either success or failure.
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    },
  });

  const inputClassName =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

  const handleAddPart = () => {
    const part = partsCatalog.find((row) => row.id === selectedPartId);
    if (!part) return;
    const onHand = stockOnHand(part);
    setAdditionalParts((prev) => [
      ...prev,
      {
        partId: part.id,
        name: part.partName,
        quantity: 1,
        unitCostMinor: 0,
        onHand,
      },
    ]);
    setSelectedPartId("");
    setIsAddingPart(false);
  };

  const updatePartQuantity = (partId: string, delta: number) => {
    setAdditionalParts((prev) =>
      prev.flatMap((row) => {
        if (row.partId !== partId) return [row];
        const nextQty = row.quantity + delta;
        if (nextQty <= 0) return [];
        if (nextQty > row.onHand) return [row];
        return [{ ...row, quantity: nextQty }];
      }),
    );
  };

  const handleAddLaborRow = () => {
    const amountMinor = parseRupeeInputToMinor(newLaborAmount);
    if (!newLaborDescription.trim() || amountMinor == null) return;
    setAdditionalLabor((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        description: newLaborDescription.trim(),
        amountInput: newLaborAmount,
      },
    ]);
    setNewLaborDescription("");
    setNewLaborAmount("");
    setIsAddingLabor(false);
  };

  if (isEditMode && existingQuery.isLoading) {
    return (
      <OrganizationFormLayout
        title="Edit work order"

      >
        <p className="text-sm text-gray-500">Loading work order…</p>
      </OrganizationFormLayout>
    );
  }

  return (
    <OrganizationFormLayout
      title={isEditMode ? "Edit work order" : "Log Work Order"}
      description="Creates a General work order. PM, Service, and Return Inspection work orders are generated automatically by Maintenance Schedules and Asset Register."
    >
      {(vehiclesQuery.isError ||
        laborJobCardsQuery.isError ||
        techniciansQuery.isError ||
        partsCatalogQuery.isError) && (
          <div
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            Could not load catalog data.{" "}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
                void vehiclesQuery.refetch();
                void laborJobCardsQuery.refetch();
                void techniciansQuery.refetch();
                void partsCatalogQuery.refetch();
              }}
            >
              Retry
            </button>
          </div>
        )}

      {submitError && (
        <div
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {submitError}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label
              htmlFor="fleet-vehicle"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Fleet vehicle {!isEditMode && <span className="text-red-500">*</span>}
            </label>
            {!isEditMode ? (
              <select
                id="fleet-vehicle"
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
                className={`${inputClassName} ${getFieldError("vehicleId") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                disabled={vehiclesQuery.isLoading || vehicles.length === 0}
              >
                <option value="">
                  {vehiclesQuery.isLoading
                    ? "Loading vehicles…"
                    : vehicles.length === 0
                      ? "No active fleet vehicles"
                      : "Select fleet vehicle"}
                </option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.fleetCode} — {vehicle.assetClassName}
                  </option>
                ))}
              </select>
            ) : (
              <p className={`${inputClassName} flex items-center bg-gray-50`}>
                {selectedVehicle
                  ? `${selectedVehicle.fleetCode} — ${selectedVehicle.assetClassName ?? selectedVehicle.registrationNumber}`
                  : "—"}
              </p>
            )}
            {getFieldError("vehicleId") && (
              <p className="mt-1 text-xs text-red-600" role="alert">{getFieldError("vehicleId")}</p>
            )}
            {selectedVehicle && (
              <p className="mt-1 text-xs text-gray-500">
                {"registrationNumber" in selectedVehicle &&
                  `${selectedVehicle.registrationNumber} · `}
                Odometer{" "}
                {selectedVehicle.odometer.toLocaleString("en-IN")} km
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="technician"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Assigned technician{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <select
              id="technician"
              value={technicianEmployeeId}
              onChange={(event) =>
                setTechnicianEmployeeId(event.target.value)
              }
              className={inputClassName}
              disabled={techniciansQuery.isLoading}
            >
              <option value="">Unassigned</option>
              {technicians.map((tech) => (
                <option key={tech.employeeId} value={tech.employeeId}>
                  {tech.fullName} ({tech.openWorkOrderCount} open WO)
                </option>
              ))}
            </select>
            {techniciansQuery.isError && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                Could not load technicians. Use Retry above or refresh the page.
              </p>
            )}
            {!techniciansQuery.isLoading &&
              !techniciansQuery.isError &&
              technicians.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No active workshop technicians yet. In Organisation → Employees,
                  edit an active employee and enable &quot;Workshop technician&quot;
                  (inactive employees are not listed).
                </p>
              )}
          </div>

          <div>
            <label
              htmlFor="expected-completion"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Expected completion date <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="expected-completion"
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={expectedCompletionDate}
              onChange={(event) => {
                const value = event.target.value;
                // Keep the native date value in YYYY-MM-DD format with a four-digit year.
                if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                  setExpectedCompletionDate(value);
                }
              }}
              className={`${inputClassName} ${getFieldError("expectedCompletionDate") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            {getFieldError("expectedCompletionDate") && (
              <p className="mt-1 text-xs text-red-600" role="alert">{getFieldError("expectedCompletionDate")}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="reported-by"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Reported by <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <RestrictedInput
              id="reported-by"
              restrictedKind="name"
              maxLength={WORKSHOP_INPUT_LIMITS.workOrderReportedBy}
              value={reportedBy}
              onChange={(value) => setReportedBy(value)}
              className={`${inputClassName} ${getFieldError("reportedBy") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            {getFieldError("reportedBy") && (
              <p className="mt-1 text-xs text-red-600" role="alert">{getFieldError("reportedBy")}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="odometer-reading"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Odometer reading (km) <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <RestrictedInput
              id="odometer-reading"
              restrictedKind="digits"
              maxLength={WORKSHOP_INPUT_LIMITS.workOrderOdometerMaxDigits}
              value={odometerReading}
              onChange={(value) => setOdometerReading(value)}
              placeholder="e.g. 45000"
              className={`${inputClassName} ${getFieldError("odometerReading") ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            />
            {getFieldError("odometerReading") && (
              <p className="mt-1 text-xs text-red-600" role="alert">{getFieldError("odometerReading")}</p>
            )}
          </div>
        </div>

        <div className="mt-3">
          <label
            htmlFor="issue-description"
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            Issue description <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <RestrictedInput
            id="issue-description"
            restrictedKind="text"
            maxLength={WORKSHOP_INPUT_LIMITS.workOrderIssueDescription}
            value={issueDescription}
            onChange={(value) => setIssueDescription(value)}
            className={inputClassName}
          />
        </div>

        <div className="mt-3">
          <label
            htmlFor="work-order-notes"
            className="mb-1 block text-xs font-semibold text-gray-700"
          >
            Notes <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <RestrictedInput
            id="work-order-notes"
            restrictedKind="text"
            maxLength={WORKSHOP_INPUT_LIMITS.workOrderNotes}
            value={notes}
            onChange={(value) => setNotes(value)}
            className={inputClassName}
          />
        </div>

        {!isEditMode && (
          <div className="mt-3">
            <label
              htmlFor="labor-job-card"
              className="mb-1 block text-xs font-semibold text-gray-700"
            >
              Service package{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <select
              id="labor-job-card"
              value={laborJobCardId}
              onChange={(event) => setLaborJobCardId(event.target.value)}
              className={`${inputClassName} focus:border-[#FE5720] focus:ring-[#FE5720]/20`}
              disabled={laborJobCardsQuery.isLoading || laborJobCards.length === 0}
            >
              <option value="">{laborJobCards.length === 0 ? "No active service packages available" : "Select service package (optional)"}</option>
              {laborJobCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} — {formatInrFromMinor(card.laborChargeMinor)}
                </option>
              ))}
            </select>
            {templateParts.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                {templateParts.map((line) => (
                  <li key={line.partId}>
                    {line.partName} × {line.quantity}
                    {line.unitCostMinor != null &&
                      ` · ${formatInrFromMinor(line.unitCostMinor)} ea`}
                  </li>
                ))}
                {templateLaborMinor > 0 && (
                  <li>
                    Service package labour: {formatInrFromMinor(templateLaborMinor)}
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      {(isEditMode || !isEditMode) && (
        <>
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              {isEditMode ? "Add parts" : "Additional parts"}
            </p>
            {!canViewInventoryParts && (
              <p className="text-sm text-gray-600" role="status">
                Inventory view access is required to pick additional parts from
                stock.
              </p>
            )}
            {canViewInventoryParts && partsCatalogQuery.isError && (
              <div
                className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                Could not load inventory parts.{" "}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => void partsCatalogQuery.refetch()}
                >
                  Retry
                </button>
              </div>
            )}
            {additionalParts.map((part) => (
              <div
                key={part.partId}
                className="grid grid-cols-[1fr_125px_160px] items-center border-b border-gray-100 py-2 text-sm"
              >
                <span>{part.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updatePartQuantity(part.partId, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300"
                    aria-label={`Decrease ${part.name} quantity`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center">{part.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updatePartQuantity(part.partId, 1)}
                    disabled={part.quantity >= part.onHand}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 disabled:opacity-40"
                    aria-label={`Increase ${part.name} quantity`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-xs text-green-700">
                  {part.onHand} in stock
                </span>
              </div>
            ))}
            {isAddingPart && (
              <div className="mt-3 flex gap-2">
                <select
                  value={selectedPartId}
                  onChange={(event) => setSelectedPartId(event.target.value)}
                  className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm"
                  disabled={
                    !vehicleId ||
                    partsCatalogQuery.isLoading ||
                    partsCatalogQuery.isError
                  }
                >
                  <option value="">
                    {!vehicleId
                      ? "Select fleet vehicle first"
                      : partsCatalogQuery.isLoading
                        ? "Loading parts…"
                        : selectableParts.length === 0
                          ? "No inventory parts available"
                          : "Select part"}
                  </option>
                  {selectableParts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.partName} ({stockOnHand(part)} in stock)
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  disabled={!selectedPartId}
                  onClick={handleAddPart}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddingPart(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
            {getFieldError("selectedPartId") && (
              <p className="mt-1 text-xs text-red-600" role="alert">{getFieldError("selectedPartId")}</p>
            )}
            <button
              type="button"
              onClick={() => setIsAddingPart(true)}
              disabled={!vehicleId || !canViewInventoryParts}
              className="mt-2 text-xs font-semibold text-[#FE5720] disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add part
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              Additional labor
            </p>
            {additionalLabor.map((line) => (
              <div
                key={line.key}
                className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 break-words">{line.description}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span>{line.amountInput || "—"}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalLabor((previous) =>
                        previous.filter((item) => item.key !== line.key),
                      )
                    }
                    aria-label={`Remove additional labor: ${line.description}`}
                    title="Remove labor line"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
            {isAddingLabor && (
              <div className="mt-3">
                <div className="flex w-full items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <RestrictedInput
                      restrictedKind="text"
                      maxLength={WORKSHOP_INPUT_LIMITS.laborLineDescription}
                      value={newLaborDescription}
                      onChange={(value) => setNewLaborDescription(value)}
                      placeholder="Description"
                      className={`${inputClassName} ${getFieldError("newLaborDescription") ? "border-red-500" : ""}`}
                    />
                    {getFieldError("newLaborDescription") && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {getFieldError("newLaborDescription")}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <RestrictedInput
                      restrictedKind="inrRupee"
                      value={newLaborAmount}
                      onChange={(value) =>
                        setNewLaborAmount(formatRupeeInputDisplay(value))
                      }
                      placeholder="Amount (INR)"
                      className={`${inputClassName} ${getFieldError("newLaborAmount") ? "border-red-500" : ""}`}
                    />
                    {getFieldError("newLaborAmount") && (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {getFieldError("newLaborAmount")}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddLaborRow}
                    className="shrink-0"
                  >
                    Add
                  </Button>

                  <button
                    type="button"
                    onClick={() => setIsAddingLabor(false)}
                    aria-label="Cancel adding labor"
                    title="Cancel"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE5720]/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsAddingLabor(true)}
              className="mt-2 text-xs font-semibold text-[#FE5720]"
            >
              + Add labor line
            </button>
          </div>
        </>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-md border border-gray-300 bg-gray-100 px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[11px] font-semibold text-white">
          i
        </span>
        <p className="text-xs leading-5 text-gray-600">
          {isEditMode
            ? `New lines add to the work order total (${formatInrFromMinor(estimatedMinor)} for lines above).`
            : `Estimated net total: ${formatInrFromMinor(estimatedMinor)} (service package + additional lines). Recorded when created.`}
        </p>
      </div>

      <FormActions
        hasAttemptedSubmit={hasAttemptedSubmit}
        validationSummary={validationSummary}
        isSaving={isSubmitting || saveMutation.isPending}
        canSubmit={
          canSave &&
          isCoreFormValid &&
          !isAuthLoading &&
          !isSubmitting &&
          !saveMutation.isPending &&
          (!isEditMode
            ? !vehiclesQuery.isLoading &&
              !laborJobCardsQuery.isLoading &&
              !!vehicleId.trim()
            : !existingQuery.isLoading)
        }
        onCancel={() => router.push(workshopWorkOrderListHref)}
        onSave={handleSave}
        saveLabel={isEditMode ? "Save changes" : "Log work order"}
        savingLabel={isEditMode ? "Saving..." : "Creating..."}
      />
    </OrganizationFormLayout>
  );
}
