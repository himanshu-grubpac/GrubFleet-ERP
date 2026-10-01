"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type AssetClassFormData = {
    name: string;
    classCode?: string;
    vehicleType: string;
    fuelType: string;
    mileageFrom: string;
    mileageTo: string;
    mileageUnit: string;
    fuelTankCapacity: string;
    ratedLoadCapacity: string;
    defaultIntakeChecklist: string;
    notes: string;
};

export type CreateAssetClassFormProps = {
    mode?: "create" | "edit";
    initialData?: Partial<AssetClassFormData>;
    onCancel?: () => void;
    onSaved?: (
        data: AssetClassFormData,
    ) => void | Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

const VEHICLE_TYPES = [
    "2-Wheeler",
    "3-Wheeler",
];

const FUEL_TYPES = [
    "Petrol",
    "Diesel",
    "CNG",
    "Electric",
];

const MILEAGE_UNITS = [
    "km/L",
    "L/100 km",
    "km/kWh",
];

const INTAKE_CHECKLISTS = [
    "Standard Intake Checklist",
    "Heavy Vehicle Intake Checklist",
];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateAssetClassForm({
    mode = "create",
    initialData,
    onCancel,
    onSaved,
}: CreateAssetClassFormProps) {
    const router = useRouter();

    const isEditMode = mode === "edit";

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] =
        useState<AssetClassFormData>({
            name: initialData?.name ?? "",
            classCode:
                initialData?.classCode ?? "",
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
            ratedLoadCapacity:
                initialData?.ratedLoadCapacity ?? "",
            defaultIntakeChecklist:
                initialData?.defaultIntakeChecklist ?? "",
            notes:
                initialData?.notes ?? "",
        });

    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    /* ---------------------------------------------------------------------- */
    /* Update Form                                                            */
    /* ---------------------------------------------------------------------- */

    const updateForm = <
        K extends keyof AssetClassFormData
    >(
        key: K,
        value: AssetClassFormData[K],
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

        router.push(
            "/asset-register/assestclass",
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Save                                                                   */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");

        /* ------------------------------------------------------------------ */
        /* Validation                                                         */
        /* ------------------------------------------------------------------ */

        if (!form.name.trim()) {
            setError("Class name is required.");
            return;
        }

        if (!form.vehicleType.trim()) {
            setError("Vehicle type is required.");
            return;
        }

        if (!form.fuelType.trim()) {
            setError("Fuel type is required.");
            return;
        }

        if (!form.mileageFrom.trim()) {
            setError("Mileage from is required.");
            return;
        }

        if (!form.mileageTo.trim()) {
            setError("Mileage to is required.");
            return;
        }

        if (!form.mileageUnit.trim()) {
            setError("Mileage unit is required.");
            return;
        }

        if (!form.fuelTankCapacity.trim()) {
            setError(
                "Fuel tank capacity is required.",
            );
            return;
        }

        if (!form.ratedLoadCapacity.trim()) {
            setError(
                "Rated load capacity is required.",
            );
            return;
        }

        if (!form.defaultIntakeChecklist.trim()) {
            setError(
                "Default intake checklist is required.",
            );
            return;
        }

        if (
            Number(form.mileageFrom) >
            Number(form.mileageTo)
        ) {
            setError(
                "Mileage from cannot be greater than mileage to.",
            );
            return;
        }

        /* ------------------------------------------------------------------ */
        /* Save                                                                */
        /* ------------------------------------------------------------------ */

        try {
            setIsSaving(true);

            const assetClass: AssetClassFormData = {
                name: form.name.trim(),

                /*
                 * Class code is generated by the backend.
                 * Existing code is preserved when editing.
                 */
                classCode:
                    form.classCode?.trim() || undefined,

                vehicleType:
                    form.vehicleType.trim(),

                fuelType:
                    form.fuelType.trim(),

                mileageFrom:
                    form.mileageFrom.trim(),

                mileageTo:
                    form.mileageTo.trim(),

                mileageUnit:
                    form.mileageUnit.trim(),

                fuelTankCapacity:
                    form.fuelTankCapacity.trim(),

                ratedLoadCapacity:
                    form.ratedLoadCapacity.trim(),

                defaultIntakeChecklist:
                    form.defaultIntakeChecklist.trim(),

                notes:
                    form.notes.trim(),
            };

            if (onSaved) {
                await onSaved(assetClass);
            } else {
                router.push(
                    "/asset-register/assestclass",
                );
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

    /* ---------------------------------------------------------------------- */
    /* Input Classes                                                          */
    /* ---------------------------------------------------------------------- */

    const inputClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const selectClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

    const readOnlyInputClassName =
        "h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 outline-none";

    /* ---------------------------------------------------------------------- */
    /* UI                                                                     */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={
                isEditMode
                    ? "Edit Asset Class"
                    : "Add Asset Class"
            }
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
                        onClick={handleSave}
                        disabled={isSaving}
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
            {/* ================================================================ */}
            {/* CLASS NAME + CLASS CODE                                         */}
            {/* ================================================================ */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Class Name */}

                <div>
                    <label
                        htmlFor="asset-class-name"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Class name
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="asset-class-name"
                        type="text"
                        value={form.name}
                        onChange={(event) =>
                            updateForm(
                                "name",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. Petrol Scooter — Standard"
                        className={inputClassName}
                    />
                </div>

                {/* Class Code */}

                <div>
                    <label
                        htmlFor="asset-class-code"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Class code
                    </label>

                    <input
                        id="asset-class-code"
                        type="text"
                        value={
                            form.classCode ||
                            "Auto-assigned on save"
                        }
                        readOnly
                        className={
                            readOnlyInputClassName
                        }
                    />
                </div>
            </div>

            {/* ================================================================ */}
            {/* VEHICLE TYPE + FUEL TYPE                                         */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Vehicle Type */}

                <div>
                    <label
                        htmlFor="vehicle-type"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Vehicle type
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="vehicle-type"
                        value={form.vehicleType}
                        onChange={(event) =>
                            updateForm(
                                "vehicleType",
                                event.target.value,
                            )
                        }
                        className={selectClassName}
                    >
                        <option value="">
                            Select vehicle type
                        </option>

                        {VEHICLE_TYPES.map(
                            (type) => (
                                <option
                                    key={type}
                                    value={type}
                                >
                                    {type}
                                </option>
                            ),
                        )}
                    </select>
                </div>

                {/* Fuel Type */}

                <div>
                    <label
                        htmlFor="fuel-type"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Fuel type
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="fuel-type"
                        value={form.fuelType}
                        onChange={(event) =>
                            updateForm(
                                "fuelType",
                                event.target.value,
                            )
                        }
                        className={selectClassName}
                    >
                        <option value="">
                            Select fuel type
                        </option>

                        {FUEL_TYPES.map(
                            (fuelType) => (
                                <option
                                    key={fuelType}
                                    value={fuelType}
                                >
                                    {fuelType}
                                </option>
                            ),
                        )}
                    </select>
                </div>
            </div>

            {/* ================================================================ */}
            {/* MILEAGE + FUEL TANK CAPACITY                                     */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Mileage */}

                <div>
                    <label
                        htmlFor="mileage-from"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Mileage
                        <span className="ml-1 text-red-500">*</span>
                    </label>

                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-[#FE5720] focus-within:ring-1 focus-within:ring-[#FE5720]/20">

                        {/* From */}

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
                                    updateForm(
                                        "mileageFrom",
                                        event.target.value,
                                    )
                                }
                                placeholder="40"
                                className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-gray-900 outline-none"
                            />
                        </div>

                        {/* To */}

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
                                    updateForm(
                                        "mileageTo",
                                        event.target.value,
                                    )
                                }
                                placeholder="50"
                                className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-gray-900 outline-none"
                            />
                        </div>

                        {/* Unit */}

                        <select
                            id="mileage-unit"
                            value={form.mileageUnit}
                            onChange={(event) =>
                                updateForm(
                                    "mileageUnit",
                                    event.target.value,
                                )
                            }
                            className="w-[36%] shrink-0 border-0 border-l border-gray-200 bg-white px-1.5 text-xs text-gray-700 outline-none"
                        >
                            {MILEAGE_UNITS.map((unit) => (
                                <option
                                    key={unit}
                                    value={unit}
                                >
                                    {unit}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>



                {/* Fuel Tank Capacity */}

                <div>
                    <label
                        htmlFor="fuel-tank-capacity"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Fuel tank capacity
                        <span className="ml-1 text-red-500">*</span>
                    </label>

                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-[#FE5720] focus-within:ring-1 focus-within:ring-[#FE5720]/20">
                        <input
                            id="fuel-tank-capacity"
                            type="number"
                            min="0"
                            step="0.1"
                            value={form.fuelTankCapacity}
                            onChange={(event) =>
                                updateForm(
                                    "fuelTankCapacity",
                                    event.target.value,
                                )
                            }
                            placeholder="e.g. 5.5"
                            className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
                        />

                        <span className="flex w-10 shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
                            L
                        </span>
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* RATED LOAD + DEFAULT INTAKE CHECKLIST                            */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Rated Load Capacity */}

                <div>
                    <label
                        htmlFor="rated-load-capacity"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Rated load capacity
                        <span className="ml-1 text-red-500">*</span>
                    </label>

                    <div className="flex h-10 w-full overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-[#FE5720] focus-within:ring-1 focus-within:ring-[#FE5720]/20">
                        <input
                            id="rated-load-capacity"
                            type="number"
                            min="0"
                            step="1"
                            value={form.ratedLoadCapacity}
                            onChange={(event) =>
                                updateForm(
                                    "ratedLoadCapacity",
                                    event.target.value,
                                )
                            }
                            placeholder="e.g. 150"
                            className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
                        />

                        <span className="flex w-12 shrink-0 items-center justify-center border-l border-gray-200 text-xs text-gray-500">
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
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="default-intake-checklist"
                        value={
                            form.defaultIntakeChecklist
                        }
                        onChange={(event) =>
                            updateForm(
                                "defaultIntakeChecklist",
                                event.target.value,
                            )
                        }
                        className={selectClassName}
                    >
                        <option value="">
                            Select checklist
                        </option>

                        {INTAKE_CHECKLISTS.map(
                            (checklist) => (
                                <option
                                    key={checklist}
                                    value={checklist}
                                >
                                    {checklist}
                                </option>
                            ),
                        )}
                    </select>
                </div>
            </div>

            {/* ================================================================ */}
            {/* NOTES                                                             */}
            {/* ================================================================ */}

            <div className="mt-4">
                <label
                    htmlFor="asset-class-notes"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Notes
                </label>

                <textarea
                    id="asset-class-notes"
                    value={form.notes}
                    onChange={(event) =>
                        updateForm(
                            "notes",
                            event.target.value,
                        )
                    }
                    placeholder="Add any additional notes about this asset class..."
                    rows={3}
                    className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                />
            </div>

            {/* ================================================================ */}
            {/* GENERAL ERROR                                                     */}
            {/* ================================================================ */}

            {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}