import type {
  AssetRegisterAssetClassDetail,
  AssetRegisterVehicleTypeApi,
} from "./asset-classes";
import type { AssetRegisterComplianceFilterStatus } from "./compliance";
import type { AssetRegisterVehicleDetail } from "./vehicles";
import type { AssetClassFormData } from "@/components/modules/assetManagement/asset-register/AssetFormPage";
import type { FleetVehicleFormData } from "@/components/modules/assetManagement/fleet-management/FleetFormPage";
import { parseRupeeInputToMajorNumber } from "@/lib/format/money-format";

/** Maps API vehicle type to existing list UI labels (no layout change). */
export type AssetRegisterVehicleTypeUiLabel =
  | "2-Wheeler"
  | "3-Wheeler"
  | "4-Wheeler";

export function mapAssetRegisterVehicleTypeToUiLabel(
  vehicleType: AssetRegisterVehicleTypeApi,
): AssetRegisterVehicleTypeUiLabel {
  if (vehicleType === "2W") return "2-Wheeler";
  if (vehicleType === "3W") return "3-Wheeler";
  return "4-Wheeler";
}

export function uiVehicleTypeFilterToApi(
  filter: "2-wheeler" | "3-wheeler" | "4-wheeler",
): AssetRegisterVehicleTypeApi {
  if (filter === "2-wheeler") return "2W";
  if (filter === "3-wheeler") return "3W";
  return "4W";
}

export function uiVehicleTypeLabelToApi(
  label: string,
): AssetRegisterVehicleTypeApi {
  if (label === "2-Wheeler") return "2W";
  if (label === "3-Wheeler") return "3W";
  if (label === "4-Wheeler") return "4W";
  return "3W";
}

/** Prefer structured API list; fall back to legacy paragraph storage. */
export function intakeChecklistItemsForDisplay(detail: {
  intakeChecklistItems?: string[];
  defaultIntakeChecklist?: string | null;
}): string[] {
  const items = detail.intakeChecklistItems?.filter((line) => line.trim()) ?? [];
  if (items.length > 0) {
    return items;
  }
  const legacy = detail.defaultIntakeChecklist?.trim();
  if (!legacy) {
    return [];
  }
  if (legacy.startsWith("[")) {
    try {
      const parsed = JSON.parse(legacy) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      /* fall through to line split */
    }
  }
  return legacy
    .split(/\n+/)
    .map((line) => line.replace(/^[\d.)]+\s*/, "").trim())
    .filter(Boolean);
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function optionalIntFromForm(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Number(trimmed);
}

function numericFieldToFormString(
  value: string | number | null | undefined,
): string {
  if (value == null) return "";
  const asString = String(value).trim();
  return asString;
}

function trimAssetClassFormField(
  value: string | number | null | undefined,
): string {
  if (value == null) return "";
  return String(value).trim();
}

function parseNonNegativeFormNumber(value: string): number | null {
  const trimmed = trimAssetClassFormField(value);
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/** Optional spec fields — mirrors create/update DTO bounds. */
export function validateAssetClassOptionalSpecFields(
  form: AssetClassFormData,
): string | null {
  const yearStr = form.manufacturingYear.trim();
  if (yearStr) {
    const year = Number(yearStr);
    if (!Number.isInteger(year) || year < 1980 || year > 2100) {
      return "Manufacturing year must be between 1980 and 2100, or leave it empty.";
    }
  }
  const ccStr = form.engineDisplacementCc.trim();
  if (ccStr) {
    const cc = Number(ccStr);
    if (!Number.isInteger(cc) || cc < 1) {
      return "CC must be a whole number of at least 1, or leave it empty.";
    }
  }
  return null;
}

export type AssetClassFormFieldKey =
  | "vehicleType"
  | "fuelType"
  | "manufacturingYear"
  | "engineDisplacementCc"
  | "mileageFrom"
  | "mileageTo"
  | "mileageUnit"
  | "fuelTankCapacity"
  | "ratedLoadCapacityFrom"
  | "ratedLoadCapacityTo"
  | "intakeChecklistItems";

export type AssetClassFormFieldErrors = Partial<
  Record<AssetClassFormFieldKey, string>
>;

const ASSET_CLASS_FIELD_ERROR_ORDER: AssetClassFormFieldKey[] = [
  "vehicleType",
  "fuelType",
  "manufacturingYear",
  "engineDisplacementCc",
  "mileageFrom",
  "mileageTo",
  "mileageUnit",
  "fuelTankCapacity",
  "ratedLoadCapacityFrom",
  "ratedLoadCapacityTo",
  "intakeChecklistItems",
];

/** Per-field client validation aligned with CreateAssetClassDto. */
export function validateAssetClassFormFields(
  form: AssetClassFormData,
  options?: { isSaving?: boolean },
): AssetClassFormFieldErrors {
  if (options?.isSaving) {
    return {};
  }

  const errors: AssetClassFormFieldErrors = {};

  const optionalSpecError = validateAssetClassOptionalSpecFields(form);
  if (optionalSpecError) {
    if (optionalSpecError.includes("Manufacturing year")) {
      errors.manufacturingYear = optionalSpecError;
    } else if (optionalSpecError.includes("CC")) {
      errors.engineDisplacementCc = optionalSpecError;
    }
  }

  if (!trimAssetClassFormField(form.vehicleType)) {
    errors.vehicleType = "Vehicle type is required.";
  }
  if (!trimAssetClassFormField(form.fuelType)) {
    errors.fuelType = "Fuel type is required.";
  }

  const mileageFrom = parseNonNegativeFormNumber(form.mileageFrom);
  const mileageTo = parseNonNegativeFormNumber(form.mileageTo);
  const fuelTankCapacity = parseNonNegativeFormNumber(form.fuelTankCapacity);
  const ratedLoadFrom = parseNonNegativeFormNumber(form.ratedLoadCapacityFrom);
  const ratedLoadTo = parseNonNegativeFormNumber(form.ratedLoadCapacityTo);

  if (mileageFrom === null) {
    errors.mileageFrom = "Mileage from is required.";
  }
  if (mileageTo === null) {
    errors.mileageTo = "Mileage to is required.";
  }
  if (!trimAssetClassFormField(form.mileageUnit)) {
    errors.mileageUnit = "Mileage unit is required.";
  }
  if (fuelTankCapacity === null) {
    errors.fuelTankCapacity = "Fuel tank capacity is required.";
  }
  if (ratedLoadFrom === null) {
    errors.ratedLoadCapacityFrom = "Rated load capacity (From) is required.";
  }
  if (ratedLoadTo === null) {
    errors.ratedLoadCapacityTo = "Rated load capacity (To) is required.";
  }
  if (form.intakeChecklistItems.length === 0) {
    errors.intakeChecklistItems =
      "Select at least one default intake checklist item.";
  }
  if (
    mileageFrom !== null &&
    mileageTo !== null &&
    mileageFrom > mileageTo
  ) {
    errors.mileageTo = "Mileage from cannot be greater than mileage to.";
  }
  if (
    ratedLoadFrom !== null &&
    ratedLoadTo !== null &&
    ratedLoadFrom > ratedLoadTo
  ) {
    errors.ratedLoadCapacityTo =
      "Rated load capacity from cannot be greater than rated load capacity to.";
  }

  return errors;
}

export type AssetClassFormSubmitValidation = {
  canSubmit: boolean;
  /** First blocking reason (legacy / tests). */
  blockReason: string | null;
};

/** Client gate aligned with CreateAssetClassDto required fields. */
export function validateAssetClassFormForSubmit(
  form: AssetClassFormData,
  options?: { isSaving?: boolean },
): AssetClassFormSubmitValidation {
  if (options?.isSaving) {
    return { canSubmit: false, blockReason: null };
  }

  const fieldErrors = validateAssetClassFormFields(form);
  for (const key of ASSET_CLASS_FIELD_ERROR_ORDER) {
    const message = fieldErrors[key];
    if (message) {
      return { canSubmit: false, blockReason: message };
    }
  }

  return { canSubmit: true, blockReason: null };
}

export function assetClassDetailToFormData(
  detail: AssetRegisterAssetClassDetail,
): AssetClassFormData {
  return {
    name: detail.name,
    brand: detail.brand,
    modelName: detail.modelName,
    manufacturingYear:
      detail.manufacturingYear > 0 ? String(detail.manufacturingYear) : "",
    engineDisplacementCc:
      detail.engineDisplacementCc > 0
        ? String(detail.engineDisplacementCc)
        : "",
    fuelSystem: detail.fuelSystem,
    color: detail.color,
    colorCode: detail.colorCode,
    vehicleType: mapAssetRegisterVehicleTypeToUiLabel(detail.vehicleType),
    fuelType: detail.fuelType,
    mileageFrom: numericFieldToFormString(detail.mileageFrom),
    mileageTo: numericFieldToFormString(detail.mileageTo),
    mileageUnit: detail.mileageUnit?.trim() || "km/L",
    fuelTankCapacity: numericFieldToFormString(detail.fuelTankCapacity),
    ratedLoadCapacityFrom: numericFieldToFormString(detail.ratedLoadFrom),
    ratedLoadCapacityTo: numericFieldToFormString(detail.ratedLoadTo),
    intakeChecklistItems: intakeChecklistItemsForDisplay(detail),
    defaultIntakeChecklist: detail.defaultIntakeChecklist || "",
    notes: detail.description ?? "",
  };
}

export function assetClassFormToCreatePayload(
  organizationId: string,
  data: AssetClassFormData,
) {
  const payload: import("./asset-classes").CreateAssetRegisterAssetClassPayload =
    {
      organizationId,
      vehicleType: uiVehicleTypeLabelToApi(data.vehicleType),
      fuelType: data.fuelType.trim(),
      mileageFrom: Number(data.mileageFrom),
      mileageTo: Number(data.mileageTo),
      mileageUnit: data.mileageUnit.trim(),
      fuelTankCapacity: Number(data.fuelTankCapacity),
      ratedLoadFrom: Number(data.ratedLoadCapacityFrom),
      ratedLoadTo: Number(data.ratedLoadCapacityTo),
      intakeChecklistItems: data.intakeChecklistItems,
    };
  const brand = optionalTrimmed(data.brand);
  if (brand) payload.brand = brand;
  const modelName = optionalTrimmed(data.modelName);
  if (modelName) payload.modelName = modelName;
  const manufacturingYear = optionalIntFromForm(data.manufacturingYear);
  if (manufacturingYear !== undefined) {
    payload.manufacturingYear = manufacturingYear;
  }
  const engineDisplacementCc = optionalIntFromForm(data.engineDisplacementCc);
  if (engineDisplacementCc !== undefined) {
    payload.engineDisplacementCc = engineDisplacementCc;
  }
  const fuelSystem = optionalTrimmed(data.fuelSystem);
  if (fuelSystem) payload.fuelSystem = fuelSystem;
  const color = optionalTrimmed(data.color);
  if (color) payload.color = color;
  const colorCode = optionalTrimmed(data.colorCode);
  if (colorCode) payload.colorCode = colorCode;
  const description = optionalTrimmed(data.notes);
  if (description) payload.description = description;
  return payload;
}

export function formatAssetRegisterIsoDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function mapComplianceStatusToUi(
  status: AssetRegisterComplianceFilterStatus,
): "Expired" | "Expiring Soon" | "Valid" {
  if (status === "expired") return "Expired";
  if (status === "expiring_soon") return "Expiring Soon";
  return "Valid";
}

export function mapComplianceFilterToApi(
  filter: "All" | "Expired" | "Expiring Soon" | "Valid",
): AssetRegisterComplianceFilterStatus | undefined {
  if (filter === "Expired") return "expired";
  if (filter === "Expiring Soon") return "expiring_soon";
  if (filter === "Valid") return "valid";
  return undefined;
}

export function formatMileageRangeFromSpec(spec: {
  mileageFrom: string | null;
  mileageTo: string | null;
  mileageUnit: string | null;
}): string {
  const from = spec.mileageFrom?.trim();
  const to = spec.mileageTo?.trim();
  const unit = spec.mileageUnit?.trim() || "";
  if (from && to) return `${from}–${to} ${unit}`.trim();
  if (from) return `${from} ${unit}`.trim();
  return "—";
}

export function formatRatedLoadRange(from: string | null, to: string | null): string {
  const a = from?.trim();
  const b = to?.trim();
  if (a && b) return `${a}–${b} kg`;
  if (a) return `${a} kg`;
  return "—";
}

export function vehicleDetailToFleetFormData(
  detail: AssetRegisterVehicleDetail,
): FleetVehicleFormData {
  return {
    assetClassId: detail.assetClassId,
    vehicleName: detail.assetClassSpecLabel || detail.assetClassName,
    insuranceSupplierId: detail.insuranceSupplierId ?? "",
    purchaseInvoiceId: detail.purchaseInvoiceId ?? "",
    registrationNumber: detail.registrationNumber,
    chassisNumber: detail.chassisNumber,
    modelYear: String(detail.modelYear),
    odometerReading: String(detail.odometer),
    registrationStartDate: detail.registrationStartDate,
    registrationEndDate: detail.registrationEndDate,
    insurancePremium: detail.insurancePremium,
    insuranceStartDate: detail.insuranceStartDate,
    insuranceEndDate: detail.insuranceEndDate,
    warrantyStartDate: detail.warrantyStartDate,
    warrantyEndDate: detail.warrantyEndDate,
    notes: detail.specialNotes ?? "",
  };
}

export function fleetFormToCreateVehiclePayload(
  organizationId: string,
  form: FleetVehicleFormData,
) {
  return {
    organizationId,
    assetClassId: form.assetClassId,
    registrationNumber: form.registrationNumber.trim(),
    chassisNumber: form.chassisNumber.trim(),
    modelYear: Number(form.modelYear),
    odometer: Number(form.odometerReading),
    registrationStartDate: form.registrationStartDate,
    registrationEndDate: form.registrationEndDate,
    insuranceStartDate: form.insuranceStartDate,
    insuranceEndDate: form.insuranceEndDate,
    insurancePremium: parseRupeeInputToMajorNumber(form.insurancePremium),
    warrantyStartDate: form.warrantyStartDate,
    warrantyEndDate: form.warrantyEndDate,
    specialNotes: form.notes.trim() || undefined,
    purchaseInvoiceId: form.purchaseInvoiceId.trim() || undefined,
    ...(form.insuranceSupplierId.trim()
      ? { insuranceSupplierId: form.insuranceSupplierId.trim() }
      : {}),
  };
}

export function fleetFormToUpdateVehiclePayload(form: FleetVehicleFormData) {
  return {
    registrationNumber: form.registrationNumber.trim(),
    chassisNumber: form.chassisNumber.trim(),
    modelYear: Number(form.modelYear),
    odometer: Number(form.odometerReading),
    registrationStartDate: form.registrationStartDate,
    registrationEndDate: form.registrationEndDate,
    insuranceStartDate: form.insuranceStartDate,
    insuranceEndDate: form.insuranceEndDate,
    insurancePremium: parseRupeeInputToMajorNumber(form.insurancePremium),
    warrantyStartDate: form.warrantyStartDate,
    warrantyEndDate: form.warrantyEndDate,
    specialNotes: form.notes.trim() || undefined,
    purchaseInvoiceId: form.purchaseInvoiceId.trim() || undefined,
    insuranceSupplierId: form.insuranceSupplierId.trim()
      ? form.insuranceSupplierId.trim()
      : null,
  };
}

export function assetClassFormToUpdatePayload(data: AssetClassFormData) {
  const payload: Partial<
    Omit<
      import("./asset-classes").CreateAssetRegisterAssetClassPayload,
      "organizationId"
    >
  > = {
    vehicleType: uiVehicleTypeLabelToApi(data.vehicleType),
    fuelType: data.fuelType.trim(),
    mileageFrom: Number(data.mileageFrom),
    mileageTo: Number(data.mileageTo),
    mileageUnit: data.mileageUnit.trim(),
    fuelTankCapacity: Number(data.fuelTankCapacity),
    ratedLoadFrom: Number(data.ratedLoadCapacityFrom),
    ratedLoadTo: Number(data.ratedLoadCapacityTo),
    intakeChecklistItems: data.intakeChecklistItems,
  };
  const brand = optionalTrimmed(data.brand);
  if (brand) payload.brand = brand;
  const modelName = optionalTrimmed(data.modelName);
  if (modelName) payload.modelName = modelName;
  const manufacturingYear = optionalIntFromForm(data.manufacturingYear);
  if (manufacturingYear !== undefined) {
    payload.manufacturingYear = manufacturingYear;
  }
  const engineDisplacementCc = optionalIntFromForm(data.engineDisplacementCc);
  if (engineDisplacementCc !== undefined) {
    payload.engineDisplacementCc = engineDisplacementCc;
  }
  const fuelSystem = optionalTrimmed(data.fuelSystem);
  if (fuelSystem) payload.fuelSystem = fuelSystem;
  const color = optionalTrimmed(data.color);
  if (color) payload.color = color;
  const colorCode = optionalTrimmed(data.colorCode);
  if (colorCode) payload.colorCode = colorCode;
  const description = optionalTrimmed(data.notes);
  if (description) payload.description = description;
  return payload;
}
