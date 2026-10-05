"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type FleetVehicleFormData = {
    assetClassId: string;

    // Asset Master reference
    assetMasterId: string;
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
    classCode: string;

    vehicleType: string;
    fuelType: string;

    mileageFrom: string;
    mileageTo: string;
    mileageUnit: string;

    fuelTankCapacity: string;
    ratedLoadCapacity: string;

    defaultIntakeChecklist: string;
};

type AssetMasterVehicle = {
    id: string;
    assetCode: string;
    vehicleName: string;
    assetClass: string;
    vehicleType: string;
    fuelType: string;
    status: "Active" | "Inactive";
};

type PurchaseInvoice = {
    id: string;
    invoiceNumber: string;
    supplierName: string;
};

type InsuranceSupplier = {
    id: string;
    name: string;
};

/* -------------------------------------------------------------------------- */
/* Mock data                                                                  */
/* -------------------------------------------------------------------------- */

const ASSET_CLASSES: AssetClass[] = [
    {
        id: "asset-class-001",
        name: "Petrol Scooter — Standard",
        classCode: "PS-STD",
        vehicleType: "2-Wheeler",
        fuelType: "Petrol",
        mileageFrom: "45",
        mileageTo: "45",
        mileageUnit: "km/L",
        fuelTankCapacity: "5.5",
        ratedLoadCapacity: "150",
        defaultIntakeChecklist: "Standard Intake Checklist",
    },
    {
        id: "asset-class-002",
        name: "Petrol Auto — Cargo",
        classCode: "PA-CGO",
        vehicleType: "3-Wheeler",
        fuelType: "Petrol",
        mileageFrom: "17",
        mileageTo: "17",
        mileageUnit: "km/L",
        fuelTankCapacity: "8",
        ratedLoadCapacity: "500",
        defaultIntakeChecklist: "Standard Intake Checklist",
    },
];

/* -------------------------------------------------------------------------- */
/* Asset Master vehicles                                                      */
/* -------------------------------------------------------------------------- */

const ASSET_MASTER_VEHICLES: AssetMasterVehicle[] = [
    {
        id: "asset-001",
        assetCode: "AST-1001",
        vehicleName: "Activa 6G",
        assetClass: "Petrol Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Petrol",
        status: "Active",
    },
    {
        id: "asset-002",
        assetCode: "AST-1002",
        vehicleName: "Activa 6G Black",
        assetClass: "Petrol Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Petrol",
        status: "Active",
    },
    {
        id: "asset-003",
        assetCode: "AST-1003",
        vehicleName: "Activa 6G White",
        assetClass: "Petrol Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Petrol",
        status: "Active",
    },
    {
        id: "asset-004",
        assetCode: "AST-1004",
        vehicleName: "Tata 407",
        assetClass: "Petrol Auto — Cargo",
        vehicleType: "3-Wheeler",
        fuelType: "Petrol",
        status: "Active",
    },
    {
        id: "asset-005",
        assetCode: "AST-1005",
        vehicleName: "Ola S1",
        assetClass: "Petrol Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Electric",
        status: "Active",
    },
    {
        id: "asset-006",
        assetCode: "AST-1006",
        vehicleName: "TVS iQube",
        assetClass: "Petrol Scooter — Standard",
        vehicleType: "2-Wheeler",
        fuelType: "Electric",
        status: "Inactive",
    },
];

/* -------------------------------------------------------------------------- */
/* Purchase invoices                                                          */
/* -------------------------------------------------------------------------- */

const PURCHASE_INVOICES: PurchaseInvoice[] = [
    {
        id: "invoice-001",
        invoiceNumber: "PINV-2026-0142",
        supplierName: "Kedar Motors",
    },
    {
        id: "invoice-002",
        invoiceNumber: "PINV-2026-0143",
        supplierName: "ABC Automobiles",
    },
];

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

    const isEditMode = mode === "edit";

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] = useState<FleetVehicleFormData>({
        assetClassId: initialData?.assetClassId ?? "",

        assetMasterId: initialData?.assetMasterId ?? "",
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

    /* ---------------------------------------------------------------------- */
    /* Selected Asset Class                                                   */
    /* ---------------------------------------------------------------------- */

    const selectedAssetClass = ASSET_CLASSES.find(
        (item) => item.id === form.assetClassId,
    );

    /* ---------------------------------------------------------------------- */
    /* Available Asset Master Vehicles                                        */
    /* ---------------------------------------------------------------------- */

    const availableVehicles = selectedAssetClass
        ? ASSET_MASTER_VEHICLES.filter(
            (vehicle) =>
                vehicle.assetClass ===
                selectedAssetClass.name &&
                vehicle.status === "Active",
        )
        : [];

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

        if (!form.assetMasterId) {
            setError("Vehicle name is required.");
            return;
        }

        if (!form.purchaseInvoiceId) {
            setError("Purchase invoice is required.");
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

                assetMasterId:
                    form.assetMasterId.trim(),

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
                    : "Add a vehicle directly to the Fleet Register, referencing an existing Purchase invoice."
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
                        disabled={isSaving}
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Asset Class */}

                <div>
                    <label
                        htmlFor="asset-class"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Asset class
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="asset-class"
                        value={form.assetClassId}
                        onChange={(event) => {
                            const assetClassId =
                                event.target.value;

                            setForm((previous) => ({
                                ...previous,
                                assetClassId,
                                assetMasterId: "",
                                vehicleName: "",
                            }));

                            setError("");
                        }}
                        className={selectClassName}
                    >
                        <option value="">
                            Select asset class
                        </option>

                        {ASSET_CLASSES.map(
                            (assetClass) => (
                                <option
                                    key={assetClass.id}
                                    value={assetClass.id}
                                >
                                    {assetClass.name}
                                </option>
                            ),
                        )}
                    </select>
                </div>

                {/* Vehicle Name */}

                <div>
                    <label
                        htmlFor="vehicle-name"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Vehicle name
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="vehicle-name"
                        value={form.assetMasterId}
                        disabled={!form.assetClassId}
                        onChange={(event) => {
                            const assetMasterId =
                                event.target.value;

                            const selectedVehicle =
                                availableVehicles.find(
                                    (vehicle) =>
                                        vehicle.id ===
                                        assetMasterId,
                                );

                            setForm((previous) => ({
                                ...previous,
                                assetMasterId,
                                vehicleName:
                                    selectedVehicle?.vehicleName ??
                                    "",
                            }));

                            setError("");
                        }}
                        className={`${selectClassName} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`}
                    >
                        <option value="">
                            {!form.assetClassId
                                ? "Select asset class first"
                                : availableVehicles.length ===
                                    0
                                    ? "No vehicles available"
                                    : "Select vehicle"}
                        </option>

                        {availableVehicles.map(
                            (vehicle) => (
                                <option
                                    key={vehicle.id}
                                    value={vehicle.id}
                                >
                                    {vehicle.vehicleName} —{" "}
                                    {vehicle.assetCode}
                                </option>
                            ),
                        )}
                    </select>
                </div>
            </div>

            {/* ============================================================ */}
            {/* PURCHASE INVOICE                                             */}
            {/* ============================================================ */}

            <div className="mt-3">
                <label
                    htmlFor="purchase-invoice"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Purchase invoice
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <select
                    id="purchase-invoice"
                    value={form.purchaseInvoiceId}
                    onChange={(event) =>
                        updateForm(
                            "purchaseInvoiceId",
                            event.target.value,
                        )
                    }
                    className={selectClassName}
                >
                    <option value="">
                        Select purchase invoice
                    </option>

                    {PURCHASE_INVOICES.map(
                        (invoice) => (
                            <option
                                key={invoice.id}
                                value={invoice.id}
                            >
                                {invoice.invoiceNumber} —{" "}
                                {invoice.supplierName}
                            </option>
                        ),
                    )}
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
                            {selectedAssetClass.classCode}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">

                        <div>
                            <p className="text-[11px] text-gray-500">
                                Vehicle type
                            </p>

                            <p className="text-sm font-medium text-gray-900">
                                {selectedAssetClass.vehicleType}
                            </p>
                        </div>

                        <div>
                            <p className="text-[11px] text-gray-500">
                                Fuel type
                            </p>

                            <p className="text-sm font-medium text-gray-900">
                                {selectedAssetClass.fuelType}
                            </p>
                        </div>

                        <div>
                            <p className="text-[11px] text-gray-500">
                                Mileage
                            </p>

                            <p className="text-sm font-medium text-gray-900">
                                {selectedAssetClass.mileageFrom ===
                                    selectedAssetClass.mileageTo
                                    ? `${selectedAssetClass.mileageFrom} ${selectedAssetClass.mileageUnit}`
                                    : `${selectedAssetClass.mileageFrom}–${selectedAssetClass.mileageTo} ${selectedAssetClass.mileageUnit}`}
                            </p>
                        </div>

                        <div>
                            <p className="text-[11px] text-gray-500">
                                Fuel tank
                            </p>

                            <p className="text-sm font-medium text-gray-900">
                                {selectedAssetClass.fuelTankCapacity} L
                            </p>
                        </div>

                        <div>
                            <p className="text-[11px] text-gray-500">
                                Rated load
                            </p>

                            <p className="text-sm font-medium text-gray-900">
                                {selectedAssetClass.ratedLoadCapacity} kg
                            </p>
                        </div>

                    </div>
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