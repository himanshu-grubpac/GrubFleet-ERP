"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import InlineAddField from "@/components/ui/inline-add-field";
import {
  FormFieldInlineError,
  mergeCompositeShellBorderClass,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { useAuth } from "@/providers/auth-provider";
import { ASSET_REGISTER_CLASS_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { fetchAssetRegisterIntakeCatalogApi } from "@/lib/api/asset-register/catalog";
import {
  type AssetClassFormFieldErrors,
  type AssetClassFormFieldKey,
  validateAssetClassFormFields,
  validateAssetClassFormForSubmit,
} from "@/lib/api/asset-register/mappers";

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

const MILEAGE_UNITS = ["km/L", "L/100 km", "km/kWh"];

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

  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] =
    useState<AssetClassFormFieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [intakePanelExpanded, setIntakePanelExpanded] = useState(false);
  const [intakeCustomAddOpen, setIntakeCustomAddOpen] = useState(false);
  const [customIntakeOptions, setCustomIntakeOptions] = useState<string[]>([]);
  const intakeDropdownRef = useRef<HTMLDivElement>(null);

  const closeIntakeDropdown = () => {
    setIntakePanelExpanded(false);
    setIntakeCustomAddOpen(false);
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
    const unit = form.mileageUnit.trim();
    if (unit && !MILEAGE_UNITS.includes(unit)) {
      return [...MILEAGE_UNITS, unit];
    }
    return MILEAGE_UNITS;
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

  const canSubmit = useMemo(() => {
    if (isSaving) return false;
    return validateAssetClassFormForSubmit(form, { isSaving: false }).canSubmit;
  }, [form, isSaving]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/asset-register/assestclass");
  };

  const handleSave = async () => {
    setError("");
    setValidationErrors({});

    const errors = validateAssetClassFormFields(form, { isSaving: false });
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  return (
    <OrganizationFormLayout
      title={isEditMode ? "Edit Asset Class" : "Add Asset Class"}
      description="Define a vehicle class and its specifications."
      actions={
        <>
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
            disabled={!canSubmit}
            className="h-10 px-5"
          >
            {isSaving
              ? "Saving..."
              : isEditMode
                ? "Save changes"
                : "Save class"}
          </Button>
        </>
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
            aria-invalid={Boolean(validationErrors.vehicleType)}
            className={mergeFormControlBorderClass(
              Boolean(validationErrors.vehicleType),
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
          <FormFieldInlineError message={validationErrors.vehicleType} />
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
            maxLength={4}
            value={form.manufacturingYear}
            onChange={(value) => updateForm("manufacturingYear", value)}
            aria-invalid={Boolean(validationErrors.manufacturingYear)}
            className={mergeFormControlBorderClass(
              Boolean(validationErrors.manufacturingYear),
              inputClassName,
            )}
          />
          <FormFieldInlineError message={validationErrors.manufacturingYear} />
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
            aria-invalid={Boolean(validationErrors.fuelType)}
            className={mergeFormControlBorderClass(
              Boolean(validationErrors.fuelType),
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
          <FormFieldInlineError message={validationErrors.fuelType} />
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
            onChange={(value) => updateForm("colorCode", value)}
            className={inputClassName}
          />
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
            maxLength={5}
            value={form.engineDisplacementCc}
            onChange={(value) => updateForm("engineDisplacementCc", value)}
            aria-invalid={Boolean(validationErrors.engineDisplacementCc)}
            className={mergeFormControlBorderClass(
              Boolean(validationErrors.engineDisplacementCc),
              inputClassName,
            )}
          />
          <FormFieldInlineError message={validationErrors.engineDisplacementCc} />
        </div>
        <div>
          <label htmlFor="mileage-from" className={labelClass}>
            Mileage
            {requiredMark}
          </label>
          <div
            className={mergeCompositeShellBorderClass(
              Boolean(
                validationErrors.mileageFrom ||
                  validationErrors.mileageTo ||
                  validationErrors.mileageUnit,
              ),
              compositeShellClass,
            )}
          >
            <div className="flex w-[32%] items-center">
              <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                From
              </span>
              <input
                id="mileage-from"
                type="number"
                min="0"
                value={form.mileageFrom}
                onChange={(event) =>
                  updateForm("mileageFrom", event.target.value)
                }
                placeholder="40"
                aria-invalid={Boolean(validationErrors.mileageFrom)}
                className={compositeInputClass}
              />
            </div>
            <div className="flex w-[32%] items-center border-l border-gray-200">
              <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                To
              </span>
              <input
                id="mileage-to"
                type="number"
                min="0"
                value={form.mileageTo}
                onChange={(event) =>
                  updateForm("mileageTo", event.target.value)
                }
                placeholder="50"
                aria-invalid={Boolean(validationErrors.mileageTo)}
                className={compositeInputClass}
              />
            </div>
            <select
              id="mileage-unit"
              value={form.mileageUnit}
              onChange={(event) =>
                updateForm("mileageUnit", event.target.value)
              }
              aria-invalid={Boolean(validationErrors.mileageUnit)}
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
              validationErrors.mileageFrom ||
              validationErrors.mileageTo ||
              validationErrors.mileageUnit
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
                validationErrors.ratedLoadCapacityFrom ||
                  validationErrors.ratedLoadCapacityTo,
              ),
              compositeShellClass,
            )}
          >
            <div className="flex w-[32%] items-center">
              <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                From
              </span>
              <input
                id="rated-load-capacity-from"
                type="number"
                min="0"
                step="1"
                value={form.ratedLoadCapacityFrom}
                onChange={(event) =>
                  updateForm("ratedLoadCapacityFrom", event.target.value)
                }
                placeholder="150"
                aria-invalid={Boolean(validationErrors.ratedLoadCapacityFrom)}
                className={compositeInputClass}
              />
            </div>
            <div className="flex w-[32%] items-center border-l border-gray-200">
              <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                To
              </span>
              <input
                id="rated-load-capacity-to"
                type="number"
                min="0"
                step="1"
                value={form.ratedLoadCapacityTo}
                onChange={(event) =>
                  updateForm("ratedLoadCapacityTo", event.target.value)
                }
                placeholder="250"
                aria-invalid={Boolean(validationErrors.ratedLoadCapacityTo)}
                className={compositeInputClass}
              />
            </div>
            <span className="flex w-[36%] shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
              kg
            </span>
          </div>
          <FormFieldInlineError
            message={
              validationErrors.ratedLoadCapacityFrom ||
              validationErrors.ratedLoadCapacityTo
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
              Boolean(validationErrors.fuelTankCapacity),
              compositeShellClass,
            )}
          >
            <input
              id="fuel-tank-capacity"
              type="number"
              min="0"
              step="0.1"
              value={form.fuelTankCapacity}
              onChange={(event) =>
                updateForm("fuelTankCapacity", event.target.value)
              }
              placeholder="e.g. 5.5"
              aria-invalid={Boolean(validationErrors.fuelTankCapacity)}
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
            />
            <span className="flex w-10 shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
              L
            </span>
          </div>
          <FormFieldInlineError message={validationErrors.fuelTankCapacity} />
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
              aria-invalid={Boolean(validationErrors.intakeChecklistItems)}
              className={[
                mergeFormControlBorderClass(
                  Boolean(validationErrors.intakeChecklistItems),
                  selectClassName,
                ),
                "w-full pr-10 text-left",
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
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      >
                        <span className="min-w-0 flex-1">{item}</span>
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {isSelected ? (
                            <Check
                              className="h-4 w-4 text-[#FE5720]"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="border-t border-gray-200 px-3 py-2">
              {intakeCustomAddOpen ? (
                <InlineAddField
                  placeholder="Custom checklist item"
                  maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.intakeItem}
                  buttonLabel="Add"
                  disabled={isSaving}
                  onAdd={submitIntakeCustomAdd}
                />
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={() => setIntakeCustomAddOpen(true)}
                >
                  {intakeCustomAddTriggerLabel}
                </Button>
              )}
            </div>
          </div>
        ) : null}
        </div>
        <FormFieldInlineError message={validationErrors.intakeChecklistItems} />

        {form.intakeChecklistItems.length === 0 && !intakePanelExpanded ? (
          <div className="mt-2">
            {intakeCustomAddOpen ? (
              <InlineAddField
                placeholder="Custom checklist item"
                maxLength={ASSET_REGISTER_CLASS_INPUT_LIMITS.intakeItem}
                buttonLabel="Add"
                disabled={isSaving}
                onAdd={submitIntakeCustomAdd}
              />
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={() => setIntakeCustomAddOpen(true)}
              >
                Add
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {form.intakeChecklistItems.length > 0 ? (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-800">
            {form.intakeChecklistItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500">
            Selected checklist items will appear here as numbered points.
          </p>
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      ) : null}
    </OrganizationFormLayout>
  );
}
