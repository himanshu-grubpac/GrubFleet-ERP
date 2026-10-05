"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type AssetClassOption = {
    id: string;
    name: string;
    classCode?: string;

    vehicleType: string;
    fuelType: string;

    mileageFrom: string;
    mileageTo: string;
    mileageUnit: string;

    fuelTankCapacity: string;

    ratedLoadCapacityFrom: string;
    ratedLoadCapacityTo: string;

    defaultIntakeChecklist: string;

    notes?: string;
};

export type AssetMasterFormData = {
    id?: string;

    assetClassId: string;
    assetClassName: string;

    vehicleName: string;

    vehicleType: string;
    fuelType: string;

    mileageFrom: string;
    mileageTo: string;
    mileageUnit: string;

    fuelTankCapacity: string;

    ratedLoadCapacityFrom: string;
    ratedLoadCapacityTo: string;

    defaultIntakeChecklist: string;

    /*
     * Notes belong to the actual Asset Master / vehicle.
     * They are NOT inherited from Asset Class.
     */
    notes: string;
};

export type CreateAssetMasterFormProps = {
    mode?: "create" | "edit";

    initialData?: Partial<AssetMasterFormData>;

    assetClasses?: AssetClassOption[];

    onCancel?: () => void;

    onSaved?: (
        data: AssetMasterFormData,
    ) => void | Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Mock Asset Classes                                                         */
/*                                                                            */
/* Replace this with your actual Asset Class data/API when available.         */
/* -------------------------------------------------------------------------- */

const DEFAULT_ASSET_CLASSES: AssetClassOption[] = [
    {
        id: "asset-class-001",

        name: "Petrol Scooter — Standard",

        classCode: "AC-001",

        vehicleType: "2-Wheeler",

        fuelType: "Petrol",

        mileageFrom: "40",

        mileageTo: "50",

        mileageUnit: "km/L",

        fuelTankCapacity: "5.5",

        ratedLoadCapacityFrom: "150",

        ratedLoadCapacityTo: "250",

        defaultIntakeChecklist:
            "Standard Intake Checklist",

        notes: "",
    },

    {
        id: "asset-class-002",

        name: "Diesel Truck — Heavy",

        classCode: "AC-002",

        vehicleType: "4-Wheeler",

        fuelType: "Diesel",

        mileageFrom: "6",

        mileageTo: "10",

        mileageUnit: "km/L",

        fuelTankCapacity: "60",

        ratedLoadCapacityFrom: "1000",

        ratedLoadCapacityTo: "5000",

        defaultIntakeChecklist:
            "Heavy Vehicle Intake Checklist",

        notes: "",
    },

    {
        id: "asset-class-003",

        name: "Electric Scooter — Standard",

        classCode: "AC-003",

        vehicleType: "2-Wheeler",

        fuelType: "Electric",

        mileageFrom: "80",

        mileageTo: "120",

        mileageUnit: "km/kWh",

        fuelTankCapacity: "3",

        ratedLoadCapacityFrom: "100",

        ratedLoadCapacityTo: "180",

        defaultIntakeChecklist:
            "Standard Intake Checklist",

        notes: "",
    },
];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateAssetMasterForm({
    mode = "create",
    initialData,
    assetClasses = DEFAULT_ASSET_CLASSES,
    onCancel,
    onSaved,
}: CreateAssetMasterFormProps) {
    const router = useRouter();

    const isEditMode = mode === "edit";

    /* ---------------------------------------------------------------------- */
    /* Selected Asset Class                                                   */
    /* ---------------------------------------------------------------------- */

    const initialAssetClassId =
        initialData?.assetClassId ?? "";

    const [selectedAssetClassId, setSelectedAssetClassId] =
        useState(initialAssetClassId);

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] =
        useState<AssetMasterFormData>({
            id: initialData?.id,

            assetClassId:
                initialData?.assetClassId ?? "",

            assetClassName:
                initialData?.assetClassName ?? "",

            vehicleName:
                initialData?.vehicleName ?? "",

            vehicleType:
                initialData?.vehicleType ?? "",

            fuelType:
                initialData?.fuelType ?? "",

            mileageFrom:
                initialData?.mileageFrom ?? "",

            mileageTo:
                initialData?.mileageTo ?? "",

            mileageUnit:
                initialData?.mileageUnit ?? "km/L",

            fuelTankCapacity:
                initialData?.fuelTankCapacity ?? "",

            ratedLoadCapacityFrom:
                initialData?.ratedLoadCapacityFrom ?? "",

            ratedLoadCapacityTo:
                initialData?.ratedLoadCapacityTo ?? "",

            defaultIntakeChecklist:
                initialData?.defaultIntakeChecklist ?? "",

            notes:
                initialData?.notes ?? "",
        });

    const [error, setError] = useState("");

    const [isSaving, setIsSaving] =
        useState(false);

    /* ---------------------------------------------------------------------- */
    /* Selected Class                                                          */
    /* ---------------------------------------------------------------------- */

    const selectedAssetClass = useMemo(() => {
        if (!selectedAssetClassId) {
            return undefined;
        }

        return assetClasses.find(
            (assetClass) =>
                assetClass.id === selectedAssetClassId,
        );
    }, [
        selectedAssetClassId,
        assetClasses,
    ]);

    /* ---------------------------------------------------------------------- */
    /* Update Vehicle Name                                                     */
    /* ---------------------------------------------------------------------- */

    const updateVehicleName = (
        value: string,
    ) => {
        setForm((previous) => ({
            ...previous,
            vehicleName: value,
        }));

        setError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Update Notes                                                            */
    /* ---------------------------------------------------------------------- */

    const updateNotes = (
        value: string,
    ) => {
        setForm((previous) => ({
            ...previous,
            notes: value,
        }));

        setError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Asset Class Change                                                      */
    /* ---------------------------------------------------------------------- */

    const handleAssetClassChange = (
        assetClassId: string,
    ) => {
        setSelectedAssetClassId(assetClassId);

        setError("");

        const selectedClass =
            assetClasses.find(
                (assetClass) =>
                    assetClass.id === assetClassId,
            );

        if (!selectedClass) {
            setForm((previous) => ({
                ...previous,

                assetClassId: "",

                assetClassName: "",

                vehicleType: "",

                fuelType: "",

                mileageFrom: "",

                mileageTo: "",

                mileageUnit: "km/L",

                fuelTankCapacity: "",

                ratedLoadCapacityFrom: "",

                ratedLoadCapacityTo: "",

                defaultIntakeChecklist: "",

                /*
                 * Notes are vehicle-specific.
                 * Do not replace them when Asset Class changes.
                 */
            }));

            return;
        }

        /*
         * The Asset Class is selected by the user.
         *
         * All specifications are then copied from that class.
         *
         * These specification fields are NOT editable
         * in the Asset Master form.
         *
         * Notes remain specific to the actual vehicle.
         */

        setForm((previous) => ({
            ...previous,

            assetClassId:
                selectedClass.id,

            assetClassName:
                selectedClass.name,

            vehicleType:
                selectedClass.vehicleType,

            fuelType:
                selectedClass.fuelType,

            mileageFrom:
                selectedClass.mileageFrom,

            mileageTo:
                selectedClass.mileageTo,

            mileageUnit:
                selectedClass.mileageUnit,

            fuelTankCapacity:
                selectedClass.fuelTankCapacity,

            ratedLoadCapacityFrom:
                selectedClass.ratedLoadCapacityFrom,

            ratedLoadCapacityTo:
                selectedClass.ratedLoadCapacityTo,

            defaultIntakeChecklist:
                selectedClass.defaultIntakeChecklist,
        }));
    };

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        if (onCancel) {
            onCancel();

            return;
        }

        router.push(
            "/asset-register/asset-master",
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Save                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");

        /* ------------------------------------------------------------------ */
        /* Validation                                                          */
        /* ------------------------------------------------------------------ */

        if (!form.assetClassId.trim()) {
            setError(
                "Asset class is required.",
            );

            return;
        }

        if (!form.vehicleName.trim()) {
            setError(
                "Vehicle name is required.",
            );

            return;
        }

        /*
         * Make sure the selected class actually exists.
         */

        const selectedClass =
            assetClasses.find(
                (assetClass) =>
                    assetClass.id ===
                    form.assetClassId,
            );

        if (!selectedClass) {
            setError(
                "Selected asset class could not be found.",
            );

            return;
        }

        /* ------------------------------------------------------------------ */
        /* Save                                                                */
        /* ------------------------------------------------------------------ */

        try {
            setIsSaving(true);

            /*
             * Build the final Asset Master object.
             *
             * The specification fields come directly from the
             * selected Asset Class rather than from user-editable
             * inputs.
             *
             * Notes come from the actual vehicle.
             */

            const assetMaster: AssetMasterFormData = {
                id: form.id,

                assetClassId:
                    selectedClass.id,

                assetClassName:
                    selectedClass.name,

                vehicleName:
                    form.vehicleName.trim(),

                vehicleType:
                    selectedClass.vehicleType,

                fuelType:
                    selectedClass.fuelType,

                mileageFrom:
                    selectedClass.mileageFrom,

                mileageTo:
                    selectedClass.mileageTo,

                mileageUnit:
                    selectedClass.mileageUnit,

                fuelTankCapacity:
                    selectedClass.fuelTankCapacity,

                ratedLoadCapacityFrom:
                    selectedClass.ratedLoadCapacityFrom,

                ratedLoadCapacityTo:
                    selectedClass.ratedLoadCapacityTo,

                defaultIntakeChecklist:
                    selectedClass.defaultIntakeChecklist,

                notes:
                    form.notes.trim(),
            };

            if (onSaved) {
                await onSaved(assetMaster);
            } else {
                router.push(
                    "/asset-register/asset-master",
                );
            }
        } catch {
            setError(
                isEditMode
                    ? "Failed to update asset."
                    : "Failed to save asset.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Input Classes                                                           */
    /* ---------------------------------------------------------------------- */

    const inputClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const selectClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const readOnlyInputClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 outline-none cursor-not-allowed";

    /* ---------------------------------------------------------------------- */
    /* UI                                                                       */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={
                isEditMode
                    ? "Edit Asset"
                    : "Add Asset"
            }
            description="Define a vehicle and associate it with an asset class."
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
                                : "Save asset"}
                    </Button>
                </>
            }
        >
            {/* ================================================================ */}
            {/* ASSET CLASS + VEHICLE NAME                                      */}
            {/* ================================================================ */}

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
                        value={selectedAssetClassId}
                        onChange={(event) =>
                            handleAssetClassChange(
                                event.target.value,
                            )
                        }
                        className={selectClassName}
                    >
                        <option value="">
                            Select asset class
                        </option>

                        {assetClasses.map(
                            (assetClass) => (
                                <option
                                    key={
                                        assetClass.id
                                    }
                                    value={
                                        assetClass.id
                                    }
                                >
                                    {
                                        assetClass.name
                                    }
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

                    <input
                        id="vehicle-name"
                        type="text"
                        value={form.vehicleName}
                        onChange={(event) =>
                            updateVehicleName(
                                event.target.value,
                            )
                        }
                        placeholder="e.g. Activa 6G"
                        className={inputClassName}
                    />
                </div>
            </div>

            {/* ================================================================ */}
            {/* VEHICLE TYPE + FUEL TYPE                                        */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Vehicle Type */}

                <div>
                    <label
                        htmlFor="vehicle-type"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Vehicle type
                    </label>

                    <input
                        id="vehicle-type"
                        type="text"
                        value={
                            selectedAssetClass
                                ?.vehicleType ?? ""
                        }
                        readOnly
                        placeholder={
                            selectedAssetClass
                                ? ""
                                : "Select asset class"
                        }
                        className={
                            readOnlyInputClassName
                        }
                    />
                </div>

                {/* Fuel Type */}

                <div>
                    <label
                        htmlFor="fuel-type"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Fuel type
                    </label>

                    <input
                        id="fuel-type"
                        type="text"
                        value={
                            selectedAssetClass
                                ?.fuelType ?? ""
                        }
                        readOnly
                        placeholder={
                            selectedAssetClass
                                ? ""
                                : "Select asset class"
                        }
                        className={
                            readOnlyInputClassName
                        }
                    />
                </div>
            </div>

            {/* ================================================================ */}
            {/* MILEAGE + FUEL TANK CAPACITY                                    */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Mileage */}

                <div>
                    <label
                        htmlFor="mileage"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Mileage
                    </label>

                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-gray-300 bg-gray-50">

                        {/* From */}

                        <div className="flex w-[32%] items-center">
                            <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                                From
                            </span>

                            <input
                                id="mileage-from"
                                type="text"
                                value={
                                    selectedAssetClass
                                        ?.mileageFrom ??
                                    ""
                                }
                                readOnly
                                className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>

                        {/* To */}

                        <div className="flex w-[32%] items-center border-l border-gray-200">
                            <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                                To
                            </span>

                            <input
                                id="mileage-to"
                                type="text"
                                value={
                                    selectedAssetClass
                                        ?.mileageTo ??
                                    ""
                                }
                                readOnly
                                className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>

                        {/* Unit */}

                        <span className="flex w-[36%] shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
                            {selectedAssetClass
                                ?.mileageUnit ?? "—"}
                        </span>
                    </div>
                </div>

                {/* Fuel Tank Capacity */}

                <div>
                    <label
                        htmlFor="fuel-tank-capacity"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Fuel tank capacity
                    </label>

                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-gray-300 bg-gray-50">

                        <input
                            id="fuel-tank-capacity"
                            type="text"
                            value={
                                selectedAssetClass
                                    ?.fuelTankCapacity ??
                                ""
                            }
                            readOnly
                            placeholder={
                                selectedAssetClass
                                    ? ""
                                    : "Select asset class"
                            }
                            className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-gray-500 outline-none cursor-not-allowed"
                        />

                        <span className="flex w-10 shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
                            L
                        </span>
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* RATED LOAD CAPACITY + DEFAULT INTAKE CHECKLIST                  */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Rated Load Capacity */}

                <div>
                    <label
                        htmlFor="rated-load-capacity"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Rated load capacity
                    </label>

                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-gray-300 bg-gray-50">

                        {/* From */}

                        <div className="flex w-[32%] items-center">
                            <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                                From
                            </span>

                            <input
                                id="rated-load-capacity-from"
                                type="text"
                                value={
                                    selectedAssetClass
                                        ?.ratedLoadCapacityFrom ??
                                    ""
                                }
                                readOnly
                                className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>

                        {/* To */}

                        <div className="flex w-[32%] items-center border-l border-gray-200">
                            <span className="shrink-0 border-r border-gray-200 px-2 text-xs text-gray-500">
                                To
                            </span>

                            <input
                                id="rated-load-capacity-to"
                                type="text"
                                value={
                                    selectedAssetClass
                                        ?.ratedLoadCapacityTo ??
                                    ""
                                }
                                readOnly
                                className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>

                        {/* Unit */}

                        <span className="flex w-[36%] shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
                            kg
                        </span>
                    </div>
                </div>

                {/* Default Intake Checklist */}

                <div>
                    <label
                        htmlFor="default-intake-checklist"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Default intake checklist
                    </label>

                    <input
                        id="default-intake-checklist"
                        type="text"
                        value={
                            selectedAssetClass
                                ?.defaultIntakeChecklist ??
                            ""
                        }
                        readOnly
                        placeholder={
                            selectedAssetClass
                                ? ""
                                : "Select asset class"
                        }
                        className={
                            readOnlyInputClassName
                        }
                    />
                </div>
            </div>

            {/* ================================================================ */}
            {/* NOTES                                                            */}
            {/* ================================================================ */}

            <div className="mt-4">
                <label
                    htmlFor="notes"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Notes(optional)
                </label>

                <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) =>
                        updateNotes(
                            event.target.value,
                        )
                    }
                    rows={4}
                    placeholder="Add any notes about this vehicle"
                    className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                />
            </div>

            {/* ================================================================ */}
            {/* SELECTED CLASS INFORMATION                                      */}
            {/* ================================================================ */}

            {selectedAssetClass && (
                <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-start gap-2">
                        <span className="mt-0.5 text-xs font-semibold text-gray-500">
                            i
                        </span>

                        <p className="text-[11px] leading-5 text-gray-500">
                            Vehicle specifications are
                            inherited from the selected
                            asset class and cannot be
                            edited here. Notes are specific
                            to this vehicle and can be
                            edited.
                        </p>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* GENERAL ERROR                                                    */}
            {/* ================================================================ */}

            {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}