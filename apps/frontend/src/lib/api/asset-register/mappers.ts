import type {
  AssetRegisterAssetClassDetail,
  AssetRegisterVehicleTypeApi,
} from "./asset-classes";
import type { AssetRegisterAssetMasterDetail } from "./asset-masters";
import type { AssetRegisterComplianceFilterStatus } from "./compliance";
import type { AssetRegisterVehicleDetail } from "./vehicles";
import type { AssetClassFormData } from "@/components/modules/assetManagement/asset-register/AssetFormPage";
import type { AssetClassOption } from "@/components/modules/assetManagement/asset-Master/CreateAssetMasterForm";
import type { AssetMasterFormData } from "@/components/modules/assetManagement/asset-Master/CreateAssetMasterForm";
import type { FleetVehicleFormData } from "@/components/modules/assetManagement/fleet-management/FleetFormPage";

/** Maps API vehicle type to existing list UI labels (no layout change). */
export function mapAssetRegisterVehicleTypeToUiLabel(
  vehicleType: AssetRegisterVehicleTypeApi,
): "2-Wheeler" | "3-Wheeler" {
  if (vehicleType === "2W") return "2-Wheeler";
  return "3-Wheeler";
}

export function uiVehicleTypeFilterToApi(
  filter: "2-wheeler" | "3-wheeler",
): AssetRegisterVehicleTypeApi {
  return filter === "2-wheeler" ? "2W" : "3W";
}

export function uiVehicleTypeLabelToApi(
  label: string,
): AssetRegisterVehicleTypeApi {
  return label === "2-Wheeler" ? "2W" : "3W";
}

export function assetClassDetailToFormData(
  detail: AssetRegisterAssetClassDetail,
): AssetClassFormData {
  return {
    name: detail.name,
    classCode: detail.code,
    vehicleType: mapAssetRegisterVehicleTypeToUiLabel(detail.vehicleType),
    fuelType: detail.fuelType,
    mileageFrom: detail.mileageFrom ?? "",
    mileageTo: detail.mileageTo ?? "",
    mileageUnit: detail.mileageUnit ?? "",
    fuelTankCapacity: detail.fuelTankCapacity,
    ratedLoadCapacityFrom: detail.ratedLoadFrom,
    ratedLoadCapacityTo: detail.ratedLoadTo,
    defaultIntakeChecklist: detail.defaultIntakeChecklist || "",
    notes: detail.description ?? "",
  };
}

export function assetClassFormToCreatePayload(
  organizationId: string,
  data: AssetClassFormData,
) {
  return {
    organizationId,
    name: data.name.trim(),
    description: data.notes.trim() || undefined,
    vehicleType: uiVehicleTypeLabelToApi(data.vehicleType),
    fuelType: data.fuelType.trim(),
    mileageFrom: data.mileageFrom ? Number(data.mileageFrom) : undefined,
    mileageTo: data.mileageTo ? Number(data.mileageTo) : undefined,
    mileageUnit: data.mileageUnit.trim() || undefined,
    fuelTankCapacity: Number(data.fuelTankCapacity),
    ratedLoadFrom: Number(data.ratedLoadCapacityFrom),
    ratedLoadTo: Number(data.ratedLoadCapacityTo),
    defaultIntakeChecklist: data.defaultIntakeChecklist.trim() || undefined,
  };
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

export function assetClassDetailToMasterOption(
  detail: AssetRegisterAssetClassDetail,
): AssetClassOption {
  return {
    id: detail.id,
    name: detail.name,
    classCode: detail.code,
    vehicleType: mapAssetRegisterVehicleTypeToUiLabel(detail.vehicleType),
    fuelType: detail.fuelType,
    mileageFrom: detail.mileageFrom ?? "",
    mileageTo: detail.mileageTo ?? "",
    mileageUnit: detail.mileageUnit ?? "",
    fuelTankCapacity: detail.fuelTankCapacity,
    ratedLoadCapacityFrom: detail.ratedLoadFrom,
    ratedLoadCapacityTo: detail.ratedLoadTo,
    defaultIntakeChecklist: detail.defaultIntakeChecklist || "",
    notes: detail.description ?? "",
  };
}

export function assetMasterDetailToFormData(
  detail: AssetRegisterAssetMasterDetail,
): AssetMasterFormData {
  const spec = detail.classSpec;
  return {
    id: detail.id,
    assetClassId: detail.assetClassId,
    assetClassName: detail.assetClassName,
    vehicleName: detail.name,
    vehicleType: spec
      ? mapAssetRegisterVehicleTypeToUiLabel(
            spec.vehicleType as AssetRegisterVehicleTypeApi,
        )
      : "",
    fuelType: spec?.fuelType ?? "",
    mileageFrom: spec?.mileageFrom ?? "",
    mileageTo: spec?.mileageTo ?? "",
    mileageUnit: spec?.mileageUnit ?? "",
    fuelTankCapacity: spec?.fuelTankCapacity ?? "",
    ratedLoadCapacityFrom: spec?.ratedLoadFrom ?? "",
    ratedLoadCapacityTo: spec?.ratedLoadTo ?? "",
    defaultIntakeChecklist: "",
    notes: "",
  };
}

export function vehicleDetailToFleetFormData(
  detail: AssetRegisterVehicleDetail,
): FleetVehicleFormData {
  return {
    assetClassId: detail.assetClassId,
    assetMasterId: detail.assetMasterId,
    vehicleName: detail.assetMasterName,
    purchaseInvoiceId: detail.purchaseInvoiceId ?? "",
    registrationNumber: detail.registrationNumber,
    chassisNumber: detail.chassisNumber,
    modelYear: String(detail.modelYear),
    odometerReading: String(detail.odometer),
    registrationStartDate: detail.registrationStartDate,
    registrationEndDate: detail.registrationEndDate,
    insuranceSupplier: "",
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
    assetMasterId: form.assetMasterId,
    registrationNumber: form.registrationNumber.trim(),
    chassisNumber: form.chassisNumber.trim(),
    modelYear: Number(form.modelYear),
    odometer: Number(form.odometerReading),
    registrationStartDate: form.registrationStartDate,
    registrationEndDate: form.registrationEndDate,
    insuranceStartDate: form.insuranceStartDate,
    insuranceEndDate: form.insuranceEndDate,
    insurancePremium: Number(form.insurancePremium),
    warrantyStartDate: form.warrantyStartDate,
    warrantyEndDate: form.warrantyEndDate,
    specialNotes: form.notes.trim() || undefined,
    purchaseInvoiceId: form.purchaseInvoiceId.trim() || undefined,
  };
}

export function fleetFormToUpdateVehiclePayload(form: FleetVehicleFormData) {
  return {
    assetMasterId: form.assetMasterId,
    registrationNumber: form.registrationNumber.trim(),
    chassisNumber: form.chassisNumber.trim(),
    modelYear: Number(form.modelYear),
    odometer: Number(form.odometerReading),
    registrationStartDate: form.registrationStartDate,
    registrationEndDate: form.registrationEndDate,
    insuranceStartDate: form.insuranceStartDate,
    insuranceEndDate: form.insuranceEndDate,
    insurancePremium: Number(form.insurancePremium),
    warrantyStartDate: form.warrantyStartDate,
    warrantyEndDate: form.warrantyEndDate,
    specialNotes: form.notes.trim() || undefined,
    purchaseInvoiceId: form.purchaseInvoiceId.trim() || undefined,
  };
}

export function assetClassFormToUpdatePayload(data: AssetClassFormData) {
  return {
    name: data.name.trim(),
    description: data.notes.trim() || undefined,
    vehicleType: uiVehicleTypeLabelToApi(data.vehicleType),
    fuelType: data.fuelType.trim(),
    mileageFrom: data.mileageFrom ? Number(data.mileageFrom) : undefined,
    mileageTo: data.mileageTo ? Number(data.mileageTo) : undefined,
    mileageUnit: data.mileageUnit.trim() || undefined,
    fuelTankCapacity: Number(data.fuelTankCapacity),
    ratedLoadFrom: Number(data.ratedLoadCapacityFrom),
    ratedLoadTo: Number(data.ratedLoadCapacityTo),
    defaultIntakeChecklist: data.defaultIntakeChecklist.trim() || undefined,
  };
}
