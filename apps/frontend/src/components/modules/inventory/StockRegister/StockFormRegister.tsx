"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import FormActions from "@/components/common/FormActions";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { fetchAssetRegisterAssetClassesApi } from "@/lib/api/asset-register/asset-classes";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useAuth } from "@/providers/auth-provider";

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
    canSave?: boolean;
    isCatalogLoading?: boolean;
    onCancel?: () => void;
    onSaved?: (data: PartFormData) => void | Promise<void>;
};

function getPartFormValidationErrors(form: PartFormData): string[] {
    const errors: string[] = [];

    if (!form.name.trim()) {
        errors.push("Part name is required.");
    }

    if (form.compatibleAssetClasses.length === 0) {
        errors.push("At least one compatible asset class is required.");
    }

    if (!form.unitOfMeasure.trim()) {
        errors.push("Unit of measure is required.");
    }

    if (form.retailMarkup.trim()) {
        const retailMarkup = Number(form.retailMarkup);
        if (!Number.isFinite(retailMarkup) || retailMarkup < 0) {
            errors.push("Retail markup must be a valid number greater than or equal to zero.");
        }
    }

    if (form.wholesaleMarkup.trim()) {
        const wholesaleMarkup = Number(form.wholesaleMarkup);
        if (!Number.isFinite(wholesaleMarkup) || wholesaleMarkup < 0) {
            errors.push("Wholesale markup must be a valid number greater than or equal to zero.");
        }
    }

    if (!form.threshold.trim()) {
        errors.push("Threshold is required.");
    } else {
        const threshold = Number(form.threshold);
        if (!Number.isFinite(threshold) || threshold < 0) {
            errors.push("Threshold must be a valid number greater than or equal to zero.");
        }
    }

    return errors;
}

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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreatePartForm({
    mode = "create",
    initialData,
    canSave = true,
    isCatalogLoading = false,
    onCancel,
    onSaved,
}: CreatePartFormProps) {
    const router = useRouter();
    const { token, organizationId, isLoading: isAuthLoading } = useAuth();

    const isEditMode = mode === "edit";

    const assetClassesQuery = useQuery({
        queryKey: [
            "inventory",
            "stock-register",
            "asset-classes",
            organizationId,
        ],
        queryFn: () =>
            fetchAssetRegisterAssetClassesApi({
                token: token!,
                organizationId: organizationId!,
                page: 1,
                pageSize: 50,
                status: "active",
            }),
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardCatalogQueryOptions,
    });

    const assetClassOptions = useMemo(() => {
        return (assetClassesQuery.data?.items ?? []).map(
            (row) => row.specLabel?.trim() || row.name.trim(),
        );
    }, [assetClassesQuery.data?.items]);

    const catalogLoading =
        isCatalogLoading ||
        assetClassesQuery.isLoading ||
        assetClassesQuery.isFetching;

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] = useState<PartFormData>({
        name: initialData?.name ?? "",
        compatibleAssetClasses:
            initialData?.compatibleAssetClasses ?? [],
        unitOfMeasure:
            initialData?.unitOfMeasure &&
                UNIT_OF_MEASURE_OPTIONS.includes(initialData.unitOfMeasure)
                ? initialData.unitOfMeasure
                : "",
        retailMarkup:
            initialData?.retailMarkup ?? "",
        wholesaleMarkup:
            initialData?.wholesaleMarkup ?? "",
        threshold:
            initialData?.threshold ?? "",
    });

    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const isSubmittingRef = useRef(false);
    const [isAssetClassDropdownOpen, setIsAssetClassDropdownOpen] =
        useState(false);

    const validationSummary = useMemo(
        () => getPartFormValidationErrors(form),
        [form],
    );

    // Keep Save enabled for an invalid form so the first click can reveal errors.
    // Submission itself is blocked by handleSave until validation passes.
    const canSubmit = canSave && !isSaving && !catalogLoading;

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
        // Close after each selection; reopen to choose another item.
        setIsAssetClassDropdownOpen(false);
    };

    const clearAssetClasses = () => {
        setForm((previous) => ({
            ...previous,
            compatibleAssetClasses: [],
        }));
        setIsAssetClassDropdownOpen(false);
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
        setHasAttemptedSubmit(true);
        setError("");

        if (validationSummary.length > 0) {
            return;
        }

        if (
            !canSave ||
            isSaving ||
            catalogLoading ||
            isSubmittingRef.current
        ) {
            return;
        }

        isSubmittingRef.current = true;

        try {
            setIsSaving(true);

            const part: PartFormData = {
                name: form.name.trim(),
                compatibleAssetClasses: form.compatibleAssetClasses,
                unitOfMeasure: form.unitOfMeasure.trim(),
                retailMarkup: form.retailMarkup.trim(),
                wholesaleMarkup: form.wholesaleMarkup.trim(),
                threshold: form.threshold.trim(),
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
                <FormActions
                    hasAttemptedSubmit={hasAttemptedSubmit}
                    validationSummary={validationSummary}
                    isSaving={isSaving}
                    canSubmit={canSubmit}
                    onCancel={handleCancel}
                    onSave={handleSave}
                    saveLabel={isEditMode ? "Save changes" : "Save part"}
                    savingLabel="Saving..."
                />
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
                    className={`${inputClassName} ${hasAttemptedSubmit && !form.name.trim() ? "border-red-500" : ""}`}
                />
                {hasAttemptedSubmit && !form.name.trim() && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                        Part name is required.
                    </p>
                )}
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
                    <div className={`flex min-h-10 w-full items-center rounded-md border bg-white transition focus-within:border-[#FE5720] focus-within:ring-1 focus-within:ring-[#FE5720]/20 ${hasAttemptedSubmit && form.compatibleAssetClasses.length === 0 ? "border-red-500" : "border-gray-300"}`}>
                        <button
                            id="compatible-asset-classes"
                            type="button"
                            onClick={() =>
                                setIsAssetClassDropdownOpen((previous) => !previous)
                            }
                            aria-expanded={isAssetClassDropdownOpen}
                            aria-haspopup="listbox"
                            className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2 text-left text-sm text-gray-900 outline-none"
                        >
                            <span className={form.compatibleAssetClasses.length === 0 ? "text-gray-400" : "text-gray-900"}>
                                {form.compatibleAssetClasses.length === 0
                                    ? "Select asset class(es)"
                                    : `${form.compatibleAssetClasses.length} asset class${form.compatibleAssetClasses.length > 1 ? "es" : ""} selected`}
                            </span>
                        </button>

                        <div className="flex shrink-0 items-center gap-1 pr-2">
                            {form.compatibleAssetClasses.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearAssetClasses}
                                    aria-label="Clear selected asset classes"
                                    title="Clear selection"
                                    className="flex h-7 w-7 items-center justify-center rounded text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE5720]"
                                >
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsAssetClassDropdownOpen((previous) => !previous)}
                                aria-label={isAssetClassDropdownOpen ? "Close asset class options" : "Open asset class options"}
                                aria-expanded={isAssetClassDropdownOpen}
                                className="flex h-7 w-7 items-center justify-center rounded text-gray-500 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE5720]"
                            >
                                <svg
                                    className={`h-4 w-4 transition-transform ${isAssetClassDropdownOpen ? "rotate-180" : ""}`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {isAssetClassDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg">
                            <div className="max-h-56 overflow-y-auto py-1" role="listbox" aria-multiselectable="true" aria-labelledby="compatible-asset-classes">
                                {catalogLoading ? (
                                    <p className="px-3 py-2 text-sm text-gray-500">
                                        Loading asset classes…
                                    </p>
                                ) : assetClassOptions.length === 0 ? (
                                    <p className="px-3 py-2 text-sm text-gray-500">
                                        No active asset classes found. Add asset
                                        classes in Asset Register first.
                                    </p>
                                ) : (
                                    assetClassOptions.map((assetClass) => {
                                        const isSelected =
                                            form.compatibleAssetClasses.includes(
                                                assetClass,
                                            );

                                        return (
                                            <button
                                                key={assetClass}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() =>
                                                    toggleAssetClass(assetClass)
                                                }
                                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <span
                                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? "border-[#FE5720] bg-[#FE5720] text-white" : "border-gray-300 bg-white"}`}
                                                >
                                                    {isSelected && (
                                                        <svg
                                                            className="h-3 w-3"
                                                            viewBox="0 0 20 20"
                                                            fill="currentColor"
                                                            aria-hidden="true"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M16.704 5.29a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                    )}
                                                </span>
                                                <span>{assetClass}</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {hasAttemptedSubmit && form.compatibleAssetClasses.length === 0 && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                        At least one compatible asset class is required.
                    </p>
                )}

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
                        className={`${selectClassName} ${hasAttemptedSubmit && !form.unitOfMeasure.trim() ? "border-red-500" : ""}`}
                    >
                        <option value="">Select unit of measure</option>
                        {UNIT_OF_MEASURE_OPTIONS.map((unit) => (
                            <option key={unit} value={unit}>
                                {unit}
                            </option>
                        ))}
                    </select>
                    {hasAttemptedSubmit && !form.unitOfMeasure.trim() && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                            Unit of measure is required.
                        </p>
                    )}
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
                        className={`${inputClassName} ${hasAttemptedSubmit && form.retailMarkup.trim() && (!Number.isFinite(Number(form.retailMarkup)) || Number(form.retailMarkup) < 0) ? "border-red-500" : ""}`}
                    />
                    {hasAttemptedSubmit && form.retailMarkup.trim() && (!Number.isFinite(Number(form.retailMarkup)) || Number(form.retailMarkup) < 0) && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                            Retail markup must be a valid number greater than or equal to zero.
                        </p>
                    )}
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
                        className={`${inputClassName} ${hasAttemptedSubmit && form.wholesaleMarkup.trim() && (!Number.isFinite(Number(form.wholesaleMarkup)) || Number(form.wholesaleMarkup) < 0) ? "border-red-500" : ""}`}
                    />
                    {hasAttemptedSubmit && form.wholesaleMarkup.trim() && (!Number.isFinite(Number(form.wholesaleMarkup)) || Number(form.wholesaleMarkup) < 0) && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                            Wholesale markup must be a valid number greater than or equal to zero.
                        </p>
                    )}
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
                        className={`${inputClassName} ${hasAttemptedSubmit && (!form.threshold.trim() || !Number.isFinite(Number(form.threshold)) || Number(form.threshold) < 0) ? "border-red-500" : ""}`}
                    />
                    {hasAttemptedSubmit && !form.threshold.trim() && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                            Threshold is required.
                        </p>
                    )}
                    {hasAttemptedSubmit && form.threshold.trim() && (!Number.isFinite(Number(form.threshold)) || Number(form.threshold) < 0) && (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                            Threshold must be a valid number greater than or equal to zero.
                        </p>
                    )}
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
                <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}