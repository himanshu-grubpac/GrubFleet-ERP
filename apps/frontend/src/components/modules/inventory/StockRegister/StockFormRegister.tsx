"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/GrubpacButton";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type PartFormData = {
    name: string;
    compatibleAssetClasses: string[];
    unitOfMeasure: string;
    retailMarkup: string;
    wholesaleMarkup: string;
    threshold: string;
};

export type CreatePartFormProps = {
    mode?: "create" | "edit";
    initialData?: Partial<PartFormData>;
    onCancel?: () => void;
    onSaved?: (data: PartFormData) => void | Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

const UNIT_OF_MEASURE_OPTIONS = [
    "Each",
    "Set",
    "Pair",
    "Litre",
    "Kg",
    "Box",
];

const ASSET_CLASS_OPTIONS = [
    "Petrol Scooter — Standard",
    "Petrol Auto — Cargo",
    "Electric Scooter — Standard",
    "Diesel Truck — Heavy",
];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreatePartForm({
    mode = "create",
    initialData,
    onCancel,
    onSaved,
}: CreatePartFormProps) {
    const router = useRouter();

    const isEditMode = mode === "edit";

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] = useState<PartFormData>({
        name: initialData?.name ?? "",
        compatibleAssetClasses:
            initialData?.compatibleAssetClasses ?? [],
        unitOfMeasure:
            initialData?.unitOfMeasure ?? "Each",
        retailMarkup:
            initialData?.retailMarkup ?? "",
        wholesaleMarkup:
            initialData?.wholesaleMarkup ?? "",
        threshold:
            initialData?.threshold ?? "",
    });

    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isAssetClassDropdownOpen, setIsAssetClassDropdownOpen] =
        useState(false);

    /* ---------------------------------------------------------------------- */
    /* Update Form                                                            */
    /* ---------------------------------------------------------------------- */

    const updateForm = <K extends keyof PartFormData>(
        key: K,
        value: PartFormData[K],
    ) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));

        setError("");
    };

    /* ---------------------------------------------------------------------- */
    /* Asset Class Selection                                                  */
    /* ---------------------------------------------------------------------- */

    const toggleAssetClass = (assetClass: string) => {
        setForm((previous) => {
            const alreadySelected =
                previous.compatibleAssetClasses.includes(assetClass);

            return {
                ...previous,
                compatibleAssetClasses: alreadySelected
                    ? previous.compatibleAssetClasses.filter(
                        (item) => item !== assetClass,
                    )
                    : [
                        ...previous.compatibleAssetClasses,
                        assetClass,
                    ],
            };
        });

        setError("");
    };

    const removeAssetClass = (assetClass: string) => {
        setForm((previous) => ({
            ...previous,
            compatibleAssetClasses:
                previous.compatibleAssetClasses.filter(
                    (item) => item !== assetClass,
                ),
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

        router.push("/inventory/Stock-register");
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
            setError("Part name is required.");
            return;
        }

        if (form.compatibleAssetClasses.length === 0) {
            setError(
                "At least one compatible asset class is required.",
            );
            return;
        }

        if (!form.unitOfMeasure.trim()) {
            setError("Unit of measure is required.");
            return;
        }

        if (form.retailMarkup.trim()) {
            const retailMarkup = Number(form.retailMarkup);

            if (
                Number.isNaN(retailMarkup) ||
                retailMarkup < 0
            ) {
                setError(
                    "Retail markup must be a valid positive number.",
                );
                return;
            }
        }

        if (form.wholesaleMarkup.trim()) {
            const wholesaleMarkup = Number(
                form.wholesaleMarkup,
            );

            if (
                Number.isNaN(wholesaleMarkup) ||
                wholesaleMarkup < 0
            ) {
                setError(
                    "Wholesale markup must be a valid positive number.",
                );
                return;
            }
        }

        if (!form.threshold.trim()) {
            setError("Threshold is required.");
            return;
        }

        const threshold = Number(form.threshold);

        if (
            Number.isNaN(threshold) ||
            threshold < 0
        ) {
            setError(
                "Threshold must be a valid positive number.",
            );
            return;
        }

        /* ------------------------------------------------------------------ */
        /* Save                                                               */
        /* ------------------------------------------------------------------ */

        try {
            setIsSaving(true);

            const part: PartFormData = {
                name: form.name.trim(),

                compatibleAssetClasses:
                    form.compatibleAssetClasses,

                unitOfMeasure:
                    form.unitOfMeasure.trim(),

                retailMarkup:
                    form.retailMarkup.trim(),

                wholesaleMarkup:
                    form.wholesaleMarkup.trim(),

                threshold:
                    form.threshold.trim(),
            };

            if (onSaved) {
                await onSaved(part);
            } else {
                router.push("/inventory/Stock-register");
            }
        } catch {
            setError(
                isEditMode
                    ? "Failed to update part."
                    : "Failed to save part.",
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

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={
                isEditMode
                    ? "Edit Part"
                    : "Add Part"
            }
            description="Defines a new spare part master record — it starts at zero stock."
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
                                : "Save part"}
                    </Button>
                </>
            }
        >
            {/* ================================================================ */}
            {/* PART NAME                                                        */}
            {/* ================================================================ */}

            <div>
                <label
                    htmlFor="part-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Part name
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <input
                    id="part-name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                        updateForm(
                            "name",
                            event.target.value,
                        )
                    }
                    placeholder="e.g. Fuel Filter"
                    className={inputClassName}
                />
            </div>

            {/* ================================================================ */}
            {/* COMPATIBLE ASSET CLASSES                                         */}
            {/* ================================================================ */}

            <div className="mt-4">
                <label
                    htmlFor="compatible-asset-classes"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Compatible asset class(es)
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <div className="relative">
                    <button
                        id="compatible-asset-classes"
                        type="button"
                        onClick={() =>
                            setIsAssetClassDropdownOpen(
                                (previous) => !previous,
                            )
                        }
                        className="flex min-h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                    >
                        <span
                            className={
                                form.compatibleAssetClasses
                                    .length === 0
                                    ? "text-gray-400"
                                    : "text-gray-900"
                            }
                        >
                            {form.compatibleAssetClasses
                                .length === 0
                                ? "Select asset class(es)"
                                : `${form.compatibleAssetClasses.length} asset class${form.compatibleAssetClasses.length > 1 ? "es" : ""} selected`}
                        </span>

                        <svg
                            className={`h-4 w-4 text-gray-500 transition-transform ${isAssetClassDropdownOpen
                                ? "rotate-180"
                                : ""
                                }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>

                    {isAssetClassDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg">
                            <div className="max-h-56 overflow-y-auto py-1">
                                {ASSET_CLASS_OPTIONS.map(
                                    (assetClass) => {
                                        const isSelected =
                                            form.compatibleAssetClasses.includes(
                                                assetClass,
                                            );

                                        return (
                                            <button
                                                key={assetClass}
                                                type="button"
                                                onClick={() =>
                                                    toggleAssetClass(
                                                        assetClass,
                                                    )
                                                }
                                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <span
                                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected
                                                        ? "border-[#FE5720] bg-[#FE5720] text-white"
                                                        : "border-gray-300 bg-white"
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <svg
                                                            className="h-3 w-3"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M16.704 5.29a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    )}
                                                </span>

                                                <span>
                                                    {assetClass}
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected asset classes */}

                {form.compatibleAssetClasses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {form.compatibleAssetClasses.map(
                            (assetClass) => (
                                <span
                                    key={assetClass}
                                    className="inline-flex items-center gap-1 rounded-md border border-[#FE5720] bg-[#FE5720]/5 px-2.5 py-1 text-xs font-semibold text-gray-700"
                                >
                                    {assetClass}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeAssetClass(
                                                assetClass,
                                            )
                                        }
                                        className="ml-1 text-gray-500 hover:text-gray-900"
                                        aria-label={`Remove ${assetClass}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            ),
                        )}
                    </div>
                )}
            </div>

            {/* ================================================================ */}
            {/* UNIT OF MEASURE + RETAIL MARKUP                                  */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Unit of Measure */}

                <div>
                    <label
                        htmlFor="unit-of-measure"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Unit of measure
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="unit-of-measure"
                        value={form.unitOfMeasure}
                        onChange={(event) =>
                            updateForm(
                                "unitOfMeasure",
                                event.target.value,
                            )
                        }
                        className={selectClassName}
                    >
                        {UNIT_OF_MEASURE_OPTIONS.map(
                            (unit) => (
                                <option
                                    key={unit}
                                    value={unit}
                                >
                                    {unit}
                                </option>
                            ),
                        )}
                    </select>
                </div>

                {/* Retail Markup */}

                <div>
                    <label
                        htmlFor="retail-markup"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Retail markup %
                    </label>

                    <input
                        id="retail-markup"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.retailMarkup}
                        onChange={(event) =>
                            updateForm(
                                "retailMarkup",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. 20 — over latest batch cost"
                        className={inputClassName}
                    />
                </div>
            </div>

            {/* ================================================================ */}
            {/* WHOLESALE MARKUP + THRESHOLD                                     */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Wholesale Markup */}

                <div>
                    <label
                        htmlFor="wholesale-markup"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Wholesale markup %
                    </label>

                    <input
                        id="wholesale-markup"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.wholesaleMarkup}
                        onChange={(event) =>
                            updateForm(
                                "wholesaleMarkup",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. 10 — over latest batch cost"
                        className={inputClassName}
                    />
                </div>

                {/* Threshold */}

                <div>
                    <label
                        htmlFor="threshold"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Threshold
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="threshold"
                        type="number"
                        min="0"
                        step="1"
                        value={form.threshold}
                        onChange={(event) =>
                            updateForm(
                                "threshold",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. 10 — minimum stock level"
                        className={inputClassName}
                    />
                </div>
            </div>

            {/* ================================================================ */}
            {/* INFORMATION                                                      */}
            {/* ================================================================ */}

            <div className="mt-4 flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <span className="mt-0.5 shrink-0 text-gray-600">
                    i
                </span>

                <p className="leading-5">
                    New parts start at zero stock — stock is
                    added later via Stock Receipt, referencing
                    a Purchase invoice from Finance. Markups
                    apply automatically over whatever the
                    latest batch cost turns out to be.
                </p>
            </div>

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