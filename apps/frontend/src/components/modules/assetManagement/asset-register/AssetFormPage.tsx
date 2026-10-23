"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, X, Plus } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
  FormFieldInlineError,
  mergeCompositeShellBorderClass,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import {
  hasValidationErrors,
  validateRequired,
  type ValidationErrors,
} from "@/components/common/Commonvalidation";
import { useAuth } from "@/providers/auth-provider";
import {
  ASSET_REGISTER_CLASS_INPUT_LIMITS,
  sanitizeNonNegativeDecimalInput,
} from "@/lib/forms/restricted-input";
import { fetchAssetRegisterIntakeCatalogApi } from "@/lib/api/asset-register/catalog";
import {
  type AssetClassFormFieldErrors,
  type AssetClassFormFieldKey,
  validateAssetClassFormFields,
  validateAssetClassFormForSubmit,
} from "@/lib/api/asset-register/mappers";

const ASSET_CLASS_SPEC_DECIMAL_SANITIZE = {
  maxIntegerDigits: ASSET_REGISTER_CLASS_INPUT_LIMITS.specDecimalMaxIntegerDigits,
  maxDecimalPlaces:
    ASSET_REGISTER_CLASS_INPUT_LIMITS.specDecimalMaxFractionDigits,
} as const;

const ASSET_CLASS_RATED_LOAD_DECIMAL_SANITIZE = {
  maxIntegerDigits:
    ASSET_REGISTER_CLASS_INPUT_LIMITS.ratedLoadMaxIntegerDigits,
  maxDecimalPlaces:
    ASSET_REGISTER_CLASS_INPUT_LIMITS.specDecimalMaxFractionDigits,
} as const;


export type AssetClassFormData = {
  name: string;
  brand: string;
  modelName: string;
  manufacturingYear: string;
  engineDisplacementCc: string;
  fuelSystem: string;
  color: string;
  colorCode: string;
  vehicleType: string;
  fuelType: string;
  mileageFrom: string;
  mileageTo: string;
  mileageUnit: string;
  fuelTankCapacity: string;
  ratedLoadCapacityFrom: string;
  ratedLoadCapacityTo: string;
  intakeChecklistItems: string[];
  defaultIntakeChecklist: string;
  notes: string;
};

export type CreateAssetClassFormProps = {
  mode?: "create" | "edit";
  initialData?: Partial<AssetClassFormData>;
  onCancel?: () => void;
  onSaved?: (data: AssetClassFormData) => void | Promise<void>;
};

const VEHICLE_TYPES = ["2-Wheeler", "3-Wheeler", "4-Wheeler"];

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric"];

const MILEAGE_UNITS = ["km/L", "km/kg", "km/kWh"] as const;

const labelClass = "mb-1 block text-xs font-semibold text-gray-700";

const requiredMark = (
  <span className="ml-1 text-red-500" aria-hidden>
    *
  </span>
);

const inputClassName =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

const selectClassName = inputClassName;

const compositeShellClass =
  "flex h-10 w-full overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-[#FE5720] focus-within:ring-1 focus-within:ring-[#FE5720]/20";

const compositeInputClass =
  "h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-gray-900 outline-none";

const emptyForm = (): AssetClassFormData => ({
  name: "",
  brand: "",
  modelName: "",
  manufacturingYear: "",
  engineDisplacementCc: "",
  fuelSystem: "",
  color: "",
  colorCode: "",
  vehicleType: "",
  fuelType: "",
  mileageFrom: "",
  mileageTo: "",
  mileageUnit: "km/L",
  fuelTankCapacity: "",
  ratedLoadCapacityFrom: "",
  ratedLoadCapacityTo: "",
  intakeChecklistItems: [],
  defaultIntakeChecklist: "",
  notes: "",
});

function mergeInitialAssetClassForm(
  initialData?: Partial<AssetClassFormData>,
): AssetClassFormData {
  if (!initialData) return emptyForm();
  return {
    ...emptyForm(),
    ...initialData,
    mileageUnit: initialData.mileageUnit?.trim() || "km/L",
    intakeChecklistItems: initialData.intakeChecklistItems ?? [],
  };
}

export default function CreateAssetClassForm({
  mode = "create",
  initialData,
  onCancel,
  onSaved,
}: CreateAssetClassFormProps) {
  const router = useRouter();
  const { token, organizationId, isLoading: authLoading } = useAuth();
  const isEditMode = mode === "edit";

  const [form, setForm] = useState<AssetClassFormData>(() =>
    mergeInitialAssetClassForm(initialData),
  );
  const handleAddCustom = () => {
    setIntakeCustomAddOpen(true);
  };

  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] =
    useState<AssetClassFormFieldErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [intakePanelExpanded, setIntakePanelExpanded] = useState(false);
  const [intakeCustomAddOpen, setIntakeCustomAddOpen] = useState(false);
  const [intakeCustomValue, setIntakeCustomValue] = useState("");
  const [customIntakeOptions, setCustomIntakeOptions] = useState<string[]>([]);
  const intakeDropdownRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  const closeIntakeDropdown = () => {
    setIntakePanelExpanded(false);
    setIntakeCustomAddOpen(false);
    setIntakeCustomValue("");
  };

  useEffect(() => {
    if (!intakePanelExpanded) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        intakeDropdownRef.current &&
        !intakeDropdownRef.current.contains(event.target as Node)
      ) {
        closeIntakeDropdown();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeIntakeDropdown();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [intakePanelExpanded]);

  const catalogQuery = useQuery({
    queryKey: ["asset-register", "intake-catalog", organizationId],
    queryFn: () => {
      if (!token || !organizationId) throw new Error("Missing auth");
      return fetchAssetRegisterIntakeCatalogApi({ token, organizationId });
    },
    enabled: !!token && !!organizationId && !authLoading,
    staleTime: 60_000,
  });

  const catalogItems = catalogQuery.data?.items ?? [];

  const intakeCheckboxRows = useMemo(() => {
    const seen = new Set<string>();
    const rows: string[] = [];
    const pushUnique = (item: string) => {
      const trimmed = item.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      rows.push(trimmed);
    };
    for (const item of catalogItems) pushUnique(item);
    for (const item of customIntakeOptions) pushUnique(item);
    for (const item of form.intakeChecklistItems) pushUnique(item);
    return rows;
  }, [catalogItems, customIntakeOptions, form.intakeChecklistItems]);

  const selectedIntakeSet = useMemo(
    () => new Set(form.intakeChecklistItems),
    [form.intakeChecklistItems],  
  );

  const fuelTypeOptions = useMemo(() => {
    const trimmed = form.fuelType.trim();
    if (trimmed && !FUEL_TYPES.includes(trimmed)) {
      return [...FUEL_TYPES, trimmed];
    }
    return FUEL_TYPES;
  }, [form.fuelType]);

  const mileageUnitOptions = useMemo(() => {
    const allowed = [...MILEAGE_UNITS];
    const unit = form.mileageUnit.trim();
    if (unit && !allowed.includes(unit as (typeof MILEAGE_UNITS)[number])) {
      return allowed;
    }
    return allowed;
  }, [form.mileageUnit]);

  const clearValidationError = (field: AssetClassFormFieldKey) => {
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const updateForm = <K extends keyof AssetClassFormData>(
    key: K,
    value: AssetClassFormData[K],
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError("");
    setValidationErrors((previous) => {
      const fieldKey = key as AssetClassFormFieldKey;
      if (!previous[fieldKey]) return previous;
      const next = { ...previous };
      delete next[fieldKey];
      return next;
    });
  };

  const intakeCustomAddTriggerLabel =
    form.intakeChecklistItems.length > 0 ? "Add more" : "Add";

  const submitIntakeCustomAdd = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCustomIntakeOptions((previous) => {
      if (previous.includes(trimmed) || catalogItems.includes(trimmed)) {
        return previous;
      }
      return [...previous, trimmed];
    });
    setForm((prev) => {
      if (prev.intakeChecklistItems.includes(trimmed)) return prev;
      return {
        ...prev,
        intakeChecklistItems: [...prev.intakeChecklistItems, trimmed],
      };
    });
    setIntakeCustomValue("");
    setIntakeCustomAddOpen(false);
    setError("");
  };

  const setIntakeItemChecked = (item: string, checked: boolean) => {
    clearValidationError("intakeChecklistItems");
    setForm((prev) => {
      if (checked) {
        if (prev.intakeChecklistItems.includes(item)) return prev;
        return {
          ...prev,
          intakeChecklistItems: [...prev.intakeChecklistItems, item],
        };
      }
      return {
        ...prev,
        intakeChecklistItems: prev.intakeChecklistItems.filter((i) => i !== item),
      };
    });
    setError("");
  };

  // Keep asset-class-specific rules from the existing mapper and use the
  // shared CommonValidation helpers for the common required-field checks.
  const validateForm = (): AssetClassFormFieldErrors => {
    const errors = validateAssetClassFormFields(form, { isSaving: false });

    const requiredFields: Array<[AssetClassFormFieldKey, string, string]> = [
      ["vehicleType", form.vehicleType, "Vehicle type"],
      ["fuelType", form.fuelType, "Fuel type"],
      ["mileageFrom", form.mileageFrom, "Mileage from"],
      ["mileageTo", form.mileageTo, "Mileage to"],
      ["ratedLoadCapacityFrom", form.ratedLoadCapacityFrom, "Rated load capacity from"],
      ["ratedLoadCapacityTo", form.ratedLoadCapacityTo, "Rated load capacity to"],
      ["fuelTankCapacity", form.fuelTankCapacity, "Fuel tank capacity"],
    ];

    for (const [field, value, label] of requiredFields) {
      const message = validateRequired(value, label);
      if (message && !errors[field]) errors[field] = message;
    }

    if (form.intakeChecklistItems.length === 0 && !errors.intakeChecklistItems) {
      errors.intakeChecklistItems = validateRequired(
        form.intakeChecklistItems.join(","),
        "Default intake checklist",
      ) ?? undefined;
    }

    return errors;
  };

  const liveErrors = useMemo(() => validateForm(), [form]);
  const { canSubmit } = useMemo(
    () => validateAssetClassFormForSubmit(form, { isSaving }),
    [form, isSaving],
  );
  const displayedErrors = hasAttemptedSubmit ? liveErrors : validationErrors;
  const validationSummary = Object.values(displayedErrors).filter(
    (message): message is string => Boolean(message),
  );

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/asset-register/assestclass");
  };

  const handleSave = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSaving(true);
    setError("");
    setHasAttemptedSubmit(true);

    try {
      const errors = validateForm();
      setValidationErrors(errors);
      if (hasValidationErrors(errors as ValidationErrors)) return;

      if (onSaved) {
        await onSaved(form);
      } else {
        router.push("/asset-register/assestclass");
      }
    } catch {
      setError(
        isEditMode
          ? "Failed to update asset class."
          : "Failed to save asset class.",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <OrganizationFormLayout
      title={isEditMode ? "Edit Asset Class" : "Add Asset Class"}
      description="Define a vehicle class and its specifications."

      actions={
        <div className="flex w-full flex-col gap-4">
          {hasAttemptedSubmit && validationSummary.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="w-full text-xs leading-5 text-red-600"
            >
              <span className="font-semibold">Please fix:</span>{" "}
              {validationSummary.join(" | ")}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSubmit || isSaving}
              className="h-10 px-5"
            >
              {isSaving
                ? "Saving..."
                : isEditMode
                  ? "Save changes"
                  : "Save class"}
            </Button>
          </div>
        </div>
      }

    >
      {isEditMode ? (
        <div className="max-w-xl">
          <label htmlFor="asset-class-name-readonly" className={labelClass}>
            Class name
          </label>
          <input
            id="asset-class-name-readonly"
            readOnly
            tabIndex={-1}
            value={form.name}
            className={`${inputClassName} bg-gray-50 text-gray-600`}
          />
        </div>
      ) : null}

      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isEditMode ? "mt-4" : ""}`}>
        <div>
          <label htmlFor="vehicle-type" className={labelClass}>
            Vehicle type
            {requiredMark}
          </label>
          <select
            id="vehicle-type"
            value={form.vehicleType}
            onChange={(event) => updateForm("vehicleType", event.target.value)}
            aria-invalid={Boolean(displayedErrors.vehicleType)}
            className={mergeFormControlBorderClass(
              Boolean(displayedErrors.vehicleType),
              selectClassName,
            )}
          >
            <option value="">Select vehicle type</option>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <FormFieldInlineError message={displayedErrors.vehicleType} />
        </div>
        <div>
          <label htmlFor="asset-class-brand" className={labelClass}>
            Brand
          </label>
          <RestrictedInput
            id="asset-class-brand"
            restrictedKind="name"
            maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.brand}
            value={form.brand}
            placeholder="e.g. Honda, Tata, Bajaj"
            onChange={(value) => updateForm("brand", value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="asset-class-model" className={labelClass}>
            Model name
          </label>
          <RestrictedInput
            id="asset-class-model"
            restrictedKind="name"
            maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.modelName}
            value={form.modelName}
            placeholder="e.g. Activa 6G, Ace Gold"
            onChange={(value) => updateForm("modelName", value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="manufacturing-year" className={labelClass}>
            Manufacturing year
          </label>
          <RestrictedInput
            id="manufacturing-year"
            restrictedKind="digits"
            maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.manufacturingYearDigits}
            value={form.manufacturingYear}
            placeholder="e.g. 2025"
            onChange={(value) => updateForm("manufacturingYear", value)}
            aria-invalid={Boolean(displayedErrors.manufacturingYear)}
            className={mergeFormControlBorderClass(
              Boolean(displayedErrors.manufacturingYear),
              inputClassName,
            )}
          />
          <FormFieldInlineError message={displayedErrors.manufacturingYear} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="fuel-type" className={labelClass}>
            Fuel type
            {requiredMark}
          </label>
          <select
            id="fuel-type"
            value={form.fuelType}
            onChange={(event) => updateForm("fuelType", event.target.value)}
            aria-invalid={Boolean(displayedErrors.fuelType)}
            className={mergeFormControlBorderClass(
              Boolean(displayedErrors.fuelType),
              selectClassName,
            )}
          >
            <option value="">Select fuel type</option>
            {fuelTypeOptions.map((fuelType) => (
              <option key={fuelType} value={fuelType}>
                {fuelType}
              </option>
            ))}
          </select>
          <FormFieldInlineError message={displayedErrors.fuelType} />
        </div>
        <div>
          <label htmlFor="fuel-system" className={labelClass}>
            Fuel system
          </label>
          <RestrictedInput
            id="fuel-system"
            restrictedKind="text"
            maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.fuelSystem}
            value={form.fuelSystem}
            placeholder="e.g. Fuel injection, carburetor"
            onChange={(value) => updateForm("fuelSystem", value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="asset-class-color" className={labelClass}>
            Color
          </label>
          <RestrictedInput
            id="asset-class-color"
            restrictedKind="text"
            maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.color}
            value={form.color}
            placeholder="e.g. White, Matte black"
            onChange={(value) => updateForm("color", value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="asset-class-color-code" className={labelClass}>
            Color code
          </label>
          <RestrictedInput
            id="asset-class-color-code"
            restrictedKind="text"
            maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.colorCode}
            value={form.colorCode}
            placeholder="e.g. #FFFFFF"
            onChange={(value) => updateForm("colorCode", value)}
            aria-invalid={Boolean(displayedErrors.colorCode)}
            className={mergeFormControlBorderClass(
              Boolean(displayedErrors.colorCode),
              inputClassName,
            )}
          />
          <FormFieldInlineError message={displayedErrors.colorCode} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="engine-displacement" className={labelClass}>
            CC (displacement)
          </label>
          <RestrictedInput
            id="engine-displacement"
            restrictedKind="digits"
            maxLength={
              ASSET_REGISTER_CLASS_INPUT_LIMITS.engineDisplacementCcMaxDigits
            }
            value={form.engineDisplacementCc}
            placeholder="e.g. 110"
            onChange={(value) => updateForm("engineDisplacementCc", value)}
            aria-invalid={Boolean(displayedErrors.engineDisplacementCc)}
            className={mergeFormControlBorderClass(
              Boolean(displayedErrors.engineDisplacementCc),
              inputClassName,
            )}
          />
          <FormFieldInlineError message={displayedErrors.engineDisplacementCc} />
        </div>
        <div>
          <label htmlFor="mileage-from" className={labelClass}>
            Mileage
            {requiredMark}
          </label>
          <div
            className={mergeCompositeShellBorderClass(
              Boolean(
                displayedErrors.mileageFrom ||
                displayedErrors.mileageTo ||
                displayedErrors.mileageUnit,
              ),
              compositeShellClass,
            )}
          >
            <div className="flex w-[32%] items-center">
              <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                From
              </span>
              <RestrictedInput
                id="mileage-from"
                restrictedKind="text"
                value={form.mileageFrom}
                onChange={(value) =>
                  updateForm(
                    "mileageFrom",
                    sanitizeNonNegativeDecimalInput(
                      value,
                      ASSET_CLASS_SPEC_DECIMAL_SANITIZE,
                    ),
                  )
                }
                placeholder="40"
                aria-invalid={Boolean(displayedErrors.mileageFrom)}
                className={compositeInputClass}
              />
            </div>
            <div className="flex w-[32%] items-center border-l border-gray-200">
              <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                To
              </span>
              <RestrictedInput
                id="mileage-to"
                restrictedKind="text"
                value={form.mileageTo}
                onChange={(value) =>
                  updateForm(
                    "mileageTo",
                    sanitizeNonNegativeDecimalInput(
                      value,
                      ASSET_CLASS_SPEC_DECIMAL_SANITIZE,
                    ),
                  )
                }
                placeholder="50"
                aria-invalid={Boolean(displayedErrors.mileageTo)}
                className={compositeInputClass}
              />
            </div>
            <select
              id="mileage-unit"
              value={form.mileageUnit}
              onChange={(event) =>
                updateForm("mileageUnit", event.target.value)
              }
              aria-invalid={Boolean(displayedErrors.mileageUnit)}
              className="w-[36%] shrink-0 border-0 border-l border-gray-200 bg-white px-1.5 text-xs text-gray-700 outline-none"
              aria-label="Mileage unit"
            >
              {mileageUnitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <FormFieldInlineError
            message={
              displayedErrors.mileageFrom ||
              displayedErrors.mileageTo ||
              displayedErrors.mileageUnit
            }
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="rated-load-capacity-from" className={labelClass}>
            Rated load capacity
            {requiredMark}
          </label>
          <div
            className={mergeCompositeShellBorderClass(
              Boolean(
                displayedErrors.ratedLoadCapacityFrom ||
                displayedErrors.ratedLoadCapacityTo,
              ),
              compositeShellClass,
            )}
          >
            <div className="flex w-[32%] items-center">
              <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                From
              </span>
              <RestrictedInput
                id="rated-load-capacity-from"
                restrictedKind="text"
                value={form.ratedLoadCapacityFrom}
                onChange={(value) =>
                  updateForm(
                    "ratedLoadCapacityFrom",
                    sanitizeNonNegativeDecimalInput(
                      value,
                      ASSET_CLASS_RATED_LOAD_DECIMAL_SANITIZE,
                    ),
                  )
                }
                placeholder="150"
                aria-invalid={Boolean(displayedErrors.ratedLoadCapacityFrom)}
                className={compositeInputClass}
              />
            </div>
            <div className="flex w-[32%] items-center border-l border-gray-200">
              <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                To
              </span>
              <RestrictedInput
                id="rated-load-capacity-to"
                restrictedKind="text"
                value={form.ratedLoadCapacityTo}
                onChange={(value) =>
                  updateForm(
                    "ratedLoadCapacityTo",
                    sanitizeNonNegativeDecimalInput(
                      value,
                      ASSET_CLASS_RATED_LOAD_DECIMAL_SANITIZE,
                    ),
                  )
                }
                placeholder="250"
                aria-invalid={Boolean(displayedErrors.ratedLoadCapacityTo)}
                className={compositeInputClass}
              />
            </div>
            <span className="flex w-[36%] shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
              kg
            </span>
          </div>
          <FormFieldInlineError
            message={
              displayedErrors.ratedLoadCapacityFrom ||
              displayedErrors.ratedLoadCapacityTo
            }
          />
        </div>
        <div>
          <label htmlFor="fuel-tank-capacity" className={labelClass}>
            Fuel tank capacity
            {requiredMark}
          </label>
          <div
            className={mergeCompositeShellBorderClass(
              Boolean(displayedErrors.fuelTankCapacity),
              compositeShellClass,
            )}
          >
            <RestrictedInput
              id="fuel-tank-capacity"
              restrictedKind="text"
              value={form.fuelTankCapacity}
              onChange={(value) =>
                updateForm(
                  "fuelTankCapacity",
                  sanitizeNonNegativeDecimalInput(
                    value,
                    ASSET_CLASS_SPEC_DECIMAL_SANITIZE,
                  ),
                )
              }
              placeholder="e.g. 5.5"
              aria-invalid={Boolean(displayedErrors.fuelTankCapacity)}
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
            />
            <span className="flex w-10 shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
              L
            </span>
          </div>
          <FormFieldInlineError message={displayedErrors.fuelTankCapacity} />
        </div>
      </div>

      <div className="mt-4 sm:col-span-2">
        <label id="default-intake-checklist-label" className={labelClass}>
          Default intake checklist
          {requiredMark}
        </label>
        <div ref={intakeDropdownRef}>
          <div className="relative">
            <button
              type="button"
              id="default-intake-checklist"
              aria-haspopup="listbox"
              aria-expanded={intakePanelExpanded}
              aria-controls="default-intake-checklist-panel"
              onClick={() =>
                setIntakePanelExpanded((open) => {
                  if (open) setIntakeCustomAddOpen(false);
                  return !open;
                })
              }
              aria-invalid={Boolean(displayedErrors.intakeChecklistItems)}
              className={[
                mergeFormControlBorderClass(
                  Boolean(displayedErrors.intakeChecklistItems),
                  selectClassName,
                ),
                `w-full text-left ${form.intakeChecklistItems.length > 0 ? "pr-16" : "pr-10"}`,
                intakePanelExpanded
                  ? "rounded-b-none border-b-0 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className={
                  catalogQuery.isLoading ||
                    form.intakeChecklistItems.length > 0
                    ? "text-gray-900"
                    : "text-gray-500"
                }
              >
                {catalogQuery.isLoading
                  ? "Loading…"
                  : form.intakeChecklistItems.length > 0
                    ? `${form.intakeChecklistItems.length} item${form.intakeChecklistItems.length === 1 ? "" : "s"} selected`
                    : "Select checklist"}
              </span>
            </button>
            <ChevronDown
              className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform ${intakePanelExpanded ? "rotate-180" : ""}`}
              strokeWidth={1.7}
              aria-hidden
            />
          </div>

          {intakePanelExpanded ? (
            <div
              id="default-intake-checklist-panel"
              role="listbox"
              aria-labelledby="default-intake-checklist-label"
              className="-mt-px overflow-hidden rounded-b-md border border-gray-300 border-t-0 bg-white shadow-sm"
            >
              {catalogQuery.isError ? (
                <p className="px-3 py-2 text-sm text-red-600" role="alert">
                  Could not load checklist catalog.
                </p>
              ) : null}
              {intakeCheckboxRows.length > 0 ? (
                <ul className="max-h-56 overflow-y-auto py-1">
                  {intakeCheckboxRows.map((item) => {
                    const isSelected = selectedIntakeSet.has(item);
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setIntakeItemChecked(item, !isSelected)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected
                              ? "border-[#FE5720] bg-[#FE5720] text-white"
                              : "border-gray-300 bg-white"
                              }`}
                          >
                            {isSelected ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
                          </span>
                          <span className="min-w-0 flex-1">{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <div className="border-t border-gray-200 bg-white px-3 py-2">
                {intakeCustomAddOpen ? (
                  <form
                    className="flex w-full items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitIntakeCustomAdd(intakeCustomValue);
                    }}
                  >
                    <RestrictedInput
                      autoFocus
                      restrictedKind="text"
                      maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.intakeItem}
                      value={intakeCustomValue}
                      placeholder="Enter custom checklist item"
                      disabled={isSaving}
                      onChange={setIntakeCustomValue}
                      className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20 disabled:bg-gray-50"
                      aria-label="Custom checklist item"
                    />
                    <button
                      type="submit"
                      disabled={isSaving || !intakeCustomValue.trim()}
                      className="h-10 shrink-0 rounded-md bg-slate-700 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel adding custom checklist item"
                      title="Cancel"
                      disabled={isSaving}
                      onClick={() => {
                        setIntakeCustomValue("");
                        setIntakeCustomAddOpen(false);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      className="inline-flex items-center gap-1.5 border-0
                        bg-transparent p-0 text-sm font-semibold
                        text-[#FE5720] transition-colors
                        hover:text-[#d94412] hover:underline
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-[#FE5720]/30 focus-visible:ring-offset-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add custom
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <FormFieldInlineError message={displayedErrors.intakeChecklistItems} />

        {!intakePanelExpanded && form.intakeChecklistItems.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.intakeChecklistItems.map((item) => (
              <span
                key={item}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#FE5720] bg-orange-50 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                <span className="min-w-0 break-words">{item}</span>
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  title={`Remove ${item}`}
                  onClick={() => setIntakeItemChecked(item, false)}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-orange-100 hover:text-gray-900"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}
    </OrganizationFormLayout>
  );
}
