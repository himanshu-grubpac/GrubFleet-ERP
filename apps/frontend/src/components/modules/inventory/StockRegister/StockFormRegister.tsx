"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import FormActions from "@/components/common/FormActions";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { fetchAllActiveAssetRegisterAssetClassesApi } from "@/lib/api/asset-register/asset-classes";
import { INVENTORY_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useAuth } from "@/providers/auth-provider";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type PartFormData = {
    name: string;
    brand: string;
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
    } else if (form.name.trim().length > INVENTORY_INPUT_LIMITS.sparePartName) {
        errors.push(`Part name must be at most ${INVENTORY_INPUT_LIMITS.sparePartName} characters.`);
    }

    if (
        form.brand.trim() &&
        form.brand.trim().length > INVENTORY_INPUT_LIMITS.sparePartBrand
    ) {
        errors.push(`Brand must be at most ${INVENTORY_INPUT_LIMITS.sparePartBrand} characters.`);
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
            fetchAllActiveAssetRegisterAssetClassesApi({
                token: token!,
                organizationId: organizationId!,
            }),
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardCatalogQueryOptions,
    });

    const assetClassOptions = useMemo(() => {
        return (assetClassesQuery.data ?? []).map(
            (row) => row.specLabel?.trim() || row.name.trim(),
        );
    }, [assetClassesQuery.data]);

    const catalogLoading =
        isCatalogLoading ||
        assetClassesQuery.isLoading ||
        assetClassesQuery.isFetching;

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] = useState<PartFormData>({
        name: initialData?.name ?? "",
        brand: initialData?.brand ?? "",
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

    const validationSummary = useMemo(
        () => getPartFormValidationErrors(form),
        [form],
    );

    const canSubmit =
        canSave &&
        !isSaving &&
        !catalogLoading &&
        validationSummary.length === 0;

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

    const addAssetClass = (assetClass: string) => {
        if (!assetClass.trim()) {
            return;
        }

        setForm((previous) => {
            if (previous.compatibleAssetClasses.includes(assetClass)) {
                return previous;
            }

            return {
                ...previous,
                compatibleAssetClasses: [
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
                brand: form.brand.trim(),
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

                <RestrictedInput
                    id="part-name"
                    restrictedKind="name"
                    maxLength={INVENTORY_INPUT_LIMITS.sparePartName}
                    value={form.name}
                    onChange={(value) => updateForm("name", value)}
                    placeholder="e.g. Fuel Filter"
                    className={mergeFormControlBorderClass(
                        hasAttemptedSubmit && !form.name.trim(),
                        inputClassName,
                    )}
                    aria-invalid={hasAttemptedSubmit && !form.name.trim()}
                />
                <FormFieldInlineError
                    message={
                        hasAttemptedSubmit && !form.name.trim()
                            ? "Part name is required."
                            : undefined
                    }
                />
            </div>

            <div className="mt-4">
                <label
                    htmlFor="part-brand"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Brand <span className="font-normal text-gray-500">(optional)</span>
                </label>

                <RestrictedInput
                    id="part-brand"
                    restrictedKind="text"
                    maxLength={INVENTORY_INPUT_LIMITS.sparePartBrand}
                    value={form.brand}
                    onChange={(value) => updateForm("brand", value)}
                    placeholder="e.g. OEM manufacturer"
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

                <select
                    id="compatible-asset-classes"
                    value=""
                    onChange={(event) => addAssetClass(event.target.value)}
                    disabled={catalogLoading || assetClassOptions.length === 0}
                    className={`${selectClassName} ${hasAttemptedSubmit && form.compatibleAssetClasses.length === 0 ? "border-red-500" : ""}`}
                    aria-invalid={
                        hasAttemptedSubmit &&
                        form.compatibleAssetClasses.length === 0
                    }
                >
                    <option value="">
                        {catalogLoading
                            ? "Loading asset classes…"
                            : "Select asset class(es)"}
                    </option>
                    {assetClassOptions
                        .filter(
                            (assetClass) =>
                                !form.compatibleAssetClasses.includes(
                                    assetClass,
                                ),
                        )
                        .map((assetClass) => (
                            <option key={assetClass} value={assetClass}>
                                {assetClass}
                            </option>
                        ))}
                </select>
                <FormFieldInlineError
                    message={
                        hasAttemptedSubmit &&
                        form.compatibleAssetClasses.length === 0
                            ? "At least one compatible asset class is required."
                            : undefined
                    }
                />

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
                    <FormFieldInlineError
                        message={
                            hasAttemptedSubmit && !form.unitOfMeasure.trim()
                                ? "Unit of measure is required."
                                : undefined
                        }
                    />
                </div>

                {/* Retail Markup */}

                <div>
                    <label
                        htmlFor="retail-markup"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Retail markup %
                    </label>

                    <RestrictedInput
                        id="retail-markup"
                        restrictedKind="digits"
                        maxLength={INVENTORY_INPUT_LIMITS.markupPercentMaxDigits}
                        value={form.retailMarkup}
                        onChange={(value) => updateForm("retailMarkup", value)}
                        placeholder="e.g. 20 — over latest batch cost"
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit &&
                                form.retailMarkup.trim() !== "" &&
                                (!Number.isFinite(Number(form.retailMarkup)) ||
                                    Number(form.retailMarkup) < 0),
                            inputClassName,
                        )}
                    />
                    <FormFieldInlineError
                        message={
                            hasAttemptedSubmit &&
                            form.retailMarkup.trim() &&
                            (!Number.isFinite(Number(form.retailMarkup)) ||
                                Number(form.retailMarkup) < 0)
                                ? "Retail markup must be a valid number greater than or equal to zero."
                                : undefined
                        }
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

                    <RestrictedInput
                        id="wholesale-markup"
                        restrictedKind="digits"
                        maxLength={INVENTORY_INPUT_LIMITS.markupPercentMaxDigits}
                        value={form.wholesaleMarkup}
                        onChange={(value) => updateForm("wholesaleMarkup", value)}
                        placeholder="e.g. 10 — over latest batch cost"
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit &&
                                form.wholesaleMarkup.trim() !== "" &&
                                (!Number.isFinite(Number(form.wholesaleMarkup)) ||
                                    Number(form.wholesaleMarkup) < 0),
                            inputClassName,
                        )}
                    />
                    <FormFieldInlineError
                        message={
                            hasAttemptedSubmit &&
                            form.wholesaleMarkup.trim() &&
                            (!Number.isFinite(Number(form.wholesaleMarkup)) ||
                                Number(form.wholesaleMarkup) < 0)
                                ? "Wholesale markup must be a valid number greater than or equal to zero."
                                : undefined
                        }
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

                    <RestrictedInput
                        id="threshold"
                        restrictedKind="digits"
                        maxLength={INVENTORY_INPUT_LIMITS.reorderThresholdMaxDigits}
                        value={form.threshold}
                        onChange={(value) => updateForm("threshold", value)}
                        placeholder="e.g. 10 — minimum stock level"
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit &&
                                (!form.threshold.trim() ||
                                    !Number.isFinite(Number(form.threshold)) ||
                                    Number(form.threshold) < 0),
                            inputClassName,
                        )}
                    />
                    <FormFieldInlineError
                        message={
                            hasAttemptedSubmit && !form.threshold.trim()
                                ? "Threshold is required."
                                : hasAttemptedSubmit &&
                                    form.threshold.trim() &&
                                    (!Number.isFinite(Number(form.threshold)) ||
                                        Number(form.threshold) < 0)
                                  ? "Threshold must be a valid number greater than or equal to zero."
                                  : undefined
                        }
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
                <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}