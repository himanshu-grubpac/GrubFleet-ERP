"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  fetchAssetRegisterAssetClassApi,
  fetchAssetRegisterAssetClassesApi,
} from "@/lib/api/asset-register/asset-classes";
import {
  formatMileageRangeFromSpec,
  formatRatedLoadRange,
  mapAssetRegisterVehicleTypeToUiLabel,
} from "@/lib/api/asset-register/mappers";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type FleetVehicleFormData = {
    assetClassId: string;
    vehicleName: string;

    purchaseInvoiceId: string;

    registrationNumber: string;
    chassisNumber: string;
    modelYear: string;
    odometerReading: string;

    registrationStartDate: string;
    registrationEndDate: string;

    insuranceSupplier: string;
    insurancePremium: string;
    insuranceStartDate: string;
    insuranceEndDate: string;

    warrantyStartDate: string;
    warrantyEndDate: string;

    notes: string;
};

type AssetClass = {
    id: string;
    name: string;

    vehicleType: string;
    fuelType: string;

    mileageFrom: string;
    mileageTo: string;
    mileageUnit: string;

    fuelTankCapacity: string;
    ratedLoadCapacity: string;

    defaultIntakeChecklist: string;
};

type InsuranceSupplier = {
    id: string;
    name: string;
};

/* -------------------------------------------------------------------------- */
/* Mock data                                                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Insurance suppliers                                                        */
/* -------------------------------------------------------------------------- */

const INSURANCE_SUPPLIERS: InsuranceSupplier[] = [
    {
        id: "insurance-001",
        name: "ICICI Lombard",
    },
    {
        id: "insurance-002",
        name: "HDFC ERGO",
    },
    {
        id: "insurance-003",
        name: "Bajaj Allianz",
    },
];

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

export type CreateFleetVehicleFormProps = {
    mode?: "create" | "edit";
    initialData?: Partial<FleetVehicleFormData>;

    onCancel?: () => void;

    onSaved?: (
        data: FleetVehicleFormData,
    ) => void | Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateFleetVehicleForm({
    mode = "create",
    initialData,
    onCancel,
    onSaved,
}: CreateFleetVehicleFormProps) {
    const router = useRouter();
    const { token, organizationId, isLoading: isAuthLoading } = useAuth();

    const isEditMode = mode === "edit";

    const classesQuery = useQuery({
        queryKey: ["asset-register", "asset-classes", "active-list", organizationId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterAssetClassesApi({
                token,
                organizationId,
                page: 1,
                pageSize: 50,
                status: "active",
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const assetClassOptions = useMemo((): AssetClass[] => {
        return (classesQuery.data?.items ?? []).map((row) => ({
            id: row.id,
            name: row.specLabel || row.name,
            vehicleType: row.vehicleType === "2W" ? "2-Wheeler" : row.vehicleType === "3W" ? "3-Wheeler" : "4-Wheeler",
            fuelType: row.fuelType,
            mileageFrom: "",
            mileageTo: "",
            mileageUnit: "",
            fuelTankCapacity: "",
            ratedLoadCapacity: "",
            defaultIntakeChecklist: "",
        }));
    }, [classesQuery.data?.items]);

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] = useState<FleetVehicleFormData>({
        assetClassId: initialData?.assetClassId ?? "",
        vehicleName: initialData?.vehicleName ?? "",

        purchaseInvoiceId:
            initialData?.purchaseInvoiceId ?? "",

        registrationNumber:
            initialData?.registrationNumber ?? "",

        chassisNumber:
            initialData?.chassisNumber ?? "",

        modelYear:
            initialData?.modelYear ?? "",

        odometerReading:
            initialData?.odometerReading ?? "",

        registrationStartDate:
            initialData?.registrationStartDate ?? "",

        registrationEndDate:
            initialData?.registrationEndDate ?? "",

        insuranceSupplier:
            initialData?.insuranceSupplier ?? "",

        insurancePremium:
            initialData?.insurancePremium ?? "",

        insuranceStartDate:
            initialData?.insuranceStartDate ?? "",

        insuranceEndDate:
            initialData?.insuranceEndDate ?? "",

        warrantyStartDate:
            initialData?.warrantyStartDate ?? "",

        warrantyEndDate:
            initialData?.warrantyEndDate ?? "",

        notes:
            initialData?.notes ?? "",
    });

    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const selectedAssetClass = assetClassOptions.find(
        (item) => item.id === form.assetClassId,
    );

    const classDetailQuery = useQuery({
        queryKey: [
            "asset-register",
            "asset-class",
            organizationId,
            form.assetClassId,
        ],
        queryFn: () => {
            if (!token || !organizationId || !form.assetClassId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterAssetClassApi({
                token,
                organizationId,
                id: form.assetClassId,
            });
        },
        enabled:
            !!token &&
            !!organizationId &&
            !isAuthLoading &&
            !!form.assetClassId.trim(),
        staleTime: 30_000,
    });

    const classDetail = classDetailQuery.data;

    /* ---------------------------------------------------------------------- */
    /* Update Form                                                            */
    /* ---------------------------------------------------------------------- */

    const updateForm = <
        K extends keyof FleetVehicleFormData
    >(
        key: K,
        value: FleetVehicleFormData[K],
    ) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));

        setError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
            return;
        }

        router.push("/asset-register/fleetregister");
    };

    /* ---------------------------------------------------------------------- */
    /* Save                                                                   */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");

        if (!form.assetClassId) {
            setError("Asset class is required.");
            return;
        }

        if (!form.registrationNumber.trim()) {
            setError("Registration number is required.");
            return;
        }

        if (!form.chassisNumber.trim()) {
            setError("Chassis number is required.");
            return;
        }

        if (!form.modelYear.trim()) {
            setError("Model year is required.");
            return;
        }

        if (!form.odometerReading.trim()) {
            setError("Odometer reading is required.");
            return;
        }

        /* Registration dates */

        if (!form.registrationStartDate) {
            setError("Registration start date is required.");
            return;
        }

        if (!form.registrationEndDate) {
            setError("Registration end date is required.");
            return;
        }

        if (
            form.registrationStartDate >
            form.registrationEndDate
        ) {
            setError(
                "Registration start date cannot be after registration end date.",
            );
            return;
        }

        /* Insurance */

        if (!form.insuranceSupplier) {
            setError("Insurance supplier is required.");
            return;
        }

        if (!form.insurancePremium.trim()) {
            setError("Insurance premium is required.");
            return;
        }

        if (!form.insuranceStartDate) {
            setError("Insurance start date is required.");
            return;
        }

        if (!form.insuranceEndDate) {
            setError("Insurance end date is required.");
            return;
        }

        if (
            form.insuranceStartDate >
            form.insuranceEndDate
        ) {
            setError(
                "Insurance start date cannot be after insurance end date.",
            );
            return;
        }

        /* Warranty */

        if (!form.warrantyStartDate) {
            setError("Warranty start date is required.");
            return;
        }

        if (!form.warrantyEndDate) {
            setError("Warranty end date is required.");
            return;
        }

        if (
            form.warrantyStartDate >
            form.warrantyEndDate
        ) {
            setError(
                "Warranty start date cannot be after warranty end date.",
            );
            return;
        }

        try {
            setIsSaving(true);

            const vehicle: FleetVehicleFormData = {
                assetClassId:
                    form.assetClassId.trim(),
                vehicleName:
                    form.vehicleName.trim(),

                purchaseInvoiceId:
                    form.purchaseInvoiceId.trim(),

                registrationNumber:
                    form.registrationNumber.trim(),

                chassisNumber:
                    form.chassisNumber.trim(),

                modelYear:
                    form.modelYear.trim(),

                odometerReading:
                    form.odometerReading.trim(),

                registrationStartDate:
                    form.registrationStartDate,

                registrationEndDate:
                    form.registrationEndDate,

                insuranceSupplier:
                    form.insuranceSupplier.trim(),

                insurancePremium:
                    form.insurancePremium.trim(),

                insuranceStartDate:
                    form.insuranceStartDate,

                insuranceEndDate:
                    form.insuranceEndDate,

                warrantyStartDate:
                    form.warrantyStartDate,

                warrantyEndDate:
                    form.warrantyEndDate,

                notes:
                    form.notes.trim(),
            };

            if (onSaved) {
                await onSaved(vehicle);
            } else {
                router.push(
                    "/asset-register/fleetregister",
                );
            }
        } catch {
            setError(
                isEditMode
                    ? "Failed to update vehicle."
                    : "Failed to add vehicle.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Input classes                                                          */
    /* ---------------------------------------------------------------------- */

    const inputClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const selectClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const canSubmit = useMemo(() => {
        if (isSaving) {
            return false;
        }
        if (
            !form.assetClassId ||
            !form.registrationNumber.trim() ||
            !form.chassisNumber.trim() ||
            !form.modelYear.trim() ||
            !form.odometerReading.trim() ||
            !form.registrationStartDate ||
            !form.registrationEndDate ||
            form.registrationStartDate > form.registrationEndDate ||
            !form.insuranceSupplier ||
            !form.insurancePremium.trim() ||
            !form.insuranceStartDate ||
            !form.insuranceEndDate ||
            form.insuranceStartDate > form.insuranceEndDate ||
            !form.warrantyStartDate ||
            !form.warrantyEndDate ||
            form.warrantyStartDate > form.warrantyEndDate
        ) {
            return false;
        }
        return true;
    }, [form, isSaving]);

    /* ---------------------------------------------------------------------- */
    /* UI                                                                     */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={
                isEditMode
                    ? "Edit Vehicle"
                    : "Add Vehicle"
            }
            description={
                isEditMode
                    ? "Update the vehicle details in the Fleet Register."
                    : "Add a vehicle to the Fleet Register by selecting an asset class (spec is loaded from the class)."
            }
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
                        onClick={handleSave}
                        disabled={!canSubmit}
                        className="h-10 px-5"
                    >
                        {isSaving
                            ? "Saving..."
                            : isEditMode
                                ? "Save changes"
                                : "Add"}
                    </Button>
                </>
            }
        >
            {/* ============================================================ */}
            {/* ASSET CLASS + VEHICLE NAME                                   */}
            {/* ============================================================ */}

            <div>
                <label
                    htmlFor="asset-class"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Asset class
                    <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                    id="asset-class"
                    value={form.assetClassId}
                    onChange={(event) => {
                        const assetClassId = event.target.value;
                        const selected = assetClassOptions.find(
                            (row) => row.id === assetClassId,
                        );
                        setForm((previous) => ({
                            ...previous,
                            assetClassId,
                            vehicleName: selected?.name ?? "",
                        }));
                        setError("");
                    }}
                    className={selectClassName}
                >
                    <option value="">Select asset class</option>
                    {assetClassOptions.map((assetClass) => (
                        <option key={assetClass.id} value={assetClass.id}>
                            {assetClass.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* ============================================================ */}
            {/* ASSET CLASS CONFIGURATION                                    */}
            {/* ============================================================ */}

            {selectedAssetClass && (
                <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">

                    <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-700">
                            Asset class configuration
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                            {classDetail?.name ?? "—"}
                        </p>
                    </div>

                    {classDetailQuery.isLoading ? (
                        <p className="text-xs text-gray-500">Loading class spec…</p>
                    ) : classDetail ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
                            <div>
                                <p className="text-[11px] text-gray-500">
                                    Vehicle type
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {mapAssetRegisterVehicleTypeToUiLabel(
                                        classDetail.vehicleType,
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500">
                                    Fuel type
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {classDetail.fuelType}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500">
                                    Mileage
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatMileageRangeFromSpec(classDetail)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500">
                                    Fuel tank
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {classDetail.fuelTankCapacity?.trim()
                                        ? `${classDetail.fuelTankCapacity} L`
                                        : "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500">
                                    Rated load
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatRatedLoadRange(
                                        classDetail.ratedLoadFrom,
                                        classDetail.ratedLoadTo,
                                    )}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* ============================================================ */}
            {/* REGISTRATION NUMBER + ODOMETER                               */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>
                    <label
                        htmlFor="registration-number"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Registration number
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="registration-number"
                        type="text"
                        value={form.registrationNumber}
                        onChange={(event) =>
                            updateForm(
                                "registrationNumber",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. MH04 AB 1011"
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label
                        htmlFor="odometer-reading"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Odometer reading
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="odometer-reading"
                        type="number"
                        min="0"
                        value={form.odometerReading}
                        onChange={(event) =>
                            updateForm(
                                "odometerReading",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. 12500"
                        className={inputClassName}
                    />
                </div>
            </div>

            {/* ============================================================ */}
            {/* REGISTRATION START + END DATE                                */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>
                    <label
                        htmlFor="registration-start-date"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Registration start date
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="registration-start-date"
                        type="date"
                        value={form.registrationStartDate}
                        onChange={(event) =>
                            updateForm(
                                "registrationStartDate",
                                event.target.value,
                            )
                        }
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label
                        htmlFor="registration-end-date"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Registration end date
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="registration-end-date"
                        type="date"
                        value={form.registrationEndDate}
                        onChange={(event) =>
                            updateForm(
                                "registrationEndDate",
                                event.target.value,
                            )
                        }
                        className={inputClassName}
                    />
                </div>

            </div>

            {/* ============================================================ */}
            {/* MODEL YEAR + CHASSIS NUMBER                                  */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>
                    <label
                        htmlFor="model-year"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Model year
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="model-year"
                        type="number"
                        min="1900"
                        max="2100"
                        value={form.modelYear}
                        onChange={(event) =>
                            updateForm(
                                "modelYear",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. 2026"
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label
                        htmlFor="chassis-number"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Chassis number
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="chassis-number"
                        type="text"
                        value={form.chassisNumber}
                        onChange={(event) =>
                            updateForm(
                                "chassisNumber",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. MD2A1XX..."
                        className={inputClassName}
                    />
                </div>

            </div>

            {/* ============================================================ */}
            {/* INSURANCE SUPPLIER + INSURANCE PREMIUM                       */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>
                    <label
                        htmlFor="insurance-supplier"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Insurance supplier
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="insurance-supplier"
                        value={form.insuranceSupplier}
                        onChange={(event) =>
                            updateForm(
                                "insuranceSupplier",
                                event.target.value,
                            )
                        }
                        className={selectClassName}
                    >
                        <option value="">
                            Select insurance supplier
                        </option>

                        {INSURANCE_SUPPLIERS.map(
                            (supplier) => (
                                <option
                                    key={supplier.id}
                                    value={supplier.id}
                                >
                                    {supplier.name}
                                </option>
                            ),
                        )}
                    </select>
                </div>

                <div>
                    <label
                        htmlFor="insurance-premium"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Insurance premium
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-[#FE5720] focus-within:ring-1 focus-within:ring-[#FE5720]/20">

                        <span className="flex w-10 shrink-0 items-center justify-center border-r border-gray-200 text-xs text-gray-500">
                            ₹
                        </span>

                        <input
                            id="insurance-premium"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.insurancePremium}
                            onChange={(event) =>
                                updateForm(
                                    "insurancePremium",
                                    event.target.value,
                                )
                            }
                            placeholder="e.g. 3200"
                            className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
                        />

                    </div>
                </div>

            </div>

            {/* ============================================================ */}
            {/* INSURANCE START + END DATE                                   */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>
                    <label
                        htmlFor="insurance-start-date"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Insurance start date
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="insurance-start-date"
                        type="date"
                        value={form.insuranceStartDate}
                        onChange={(event) =>
                            updateForm(
                                "insuranceStartDate",
                                event.target.value,
                            )
                        }
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label
                        htmlFor="insurance-end-date"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Insurance end date
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="insurance-end-date"
                        type="date"
                        value={form.insuranceEndDate}
                        onChange={(event) =>
                            updateForm(
                                "insuranceEndDate",
                                event.target.value,
                            )
                        }
                        className={inputClassName}
                    />
                </div>

            </div>

            {/* ============================================================ */}
            {/* WARRANTY START + END DATE                                   */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div>
                    <label
                        htmlFor="warranty-start-date"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Warranty start date
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="warranty-start-date"
                        type="date"
                        value={form.warrantyStartDate}
                        onChange={(event) =>
                            updateForm(
                                "warrantyStartDate",
                                event.target.value,
                            )
                        }
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label
                        htmlFor="warranty-end-date"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Warranty end date
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="warranty-end-date"
                        type="date"
                        value={form.warrantyEndDate}
                        onChange={(event) =>
                            updateForm(
                                "warrantyEndDate",
                                event.target.value,
                            )
                        }
                        className={inputClassName}
                    />
                </div>

            </div>

            {/* ============================================================ */}
            {/* NOTES                                                         */}
            {/* ============================================================ */}

            <div className="mt-4">

                <label
                    htmlFor="vehicle-notes"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Notes
                    <span className="ml-1 text-gray-400">
                        (optional)
                    </span>
                </label>

                <textarea
                    id="vehicle-notes"
                    value={form.notes}
                    onChange={(event) =>
                        updateForm(
                            "notes",
                            event.target.value,
                        )
                    }
                    placeholder="e.g. Vendor: Kedar Motors, quote ref KM-2026-0148"
                    rows={3}
                    className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                />

            </div>

            {/* ============================================================ */}
            {/* GENERAL ERROR                                                 */}
            {/* ============================================================ */}

            {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* ============================================================ */}
            {/* INFORMATION                                                   */}
            {/* ============================================================ */}

            <div className="mt-4 flex gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">

                <span className="mt-0.5 text-xs text-gray-500">
                    i
                </span>

                <p className="text-xs leading-5 text-gray-500">
                    The vehicle is added to the Fleet Register
                    immediately, at Available — no QC step, no
                    waiting. The Purchase invoice reference is for
                    traceability back to Finance only; it does not
                    gate this vehicle status.
                </p>

            </div>

        </OrganizationFormLayout>
    );
}