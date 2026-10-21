"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import FormActions from "@/components/common/FormActions";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type StockFormData = {
    part: string;
    purchaseInvoice: string;
    destinationLocation: string;
    quantityReceived: string;
    unitCost: string;
    batchLotReference: string;
    notes: string;
};

export type SelectOption = { value: string; label: string };

export type CreateStockFormProps = {
    mode?: "create" | "edit";
    initialData?: Partial<StockFormData>;
    partOptions?: SelectOption[];
    locationOptions?: SelectOption[];
    purchaseInvoiceOptions?: SelectOption[];
    canSave?: boolean;
    isCatalogLoading?: boolean;
    onCancel?: () => void;
    onSaved?: (data: StockFormData) => void | Promise<void>;
};

function getStockReceiptValidationErrors(form: StockFormData): string[] {
    const errors: string[] = [];

    if (!form.part.trim()) errors.push("Part is required.");
    if (!form.purchaseInvoice.trim()) errors.push("Purchase invoice is required.");
    if (!form.destinationLocation.trim()) errors.push("Destination location is required.");

    if (!form.quantityReceived.trim()) {
        errors.push("Quantity received is required.");
    } else {
        const quantityReceived = Number(form.quantityReceived);
        if (!Number.isFinite(quantityReceived) || quantityReceived <= 0) {
            errors.push("Quantity received must be a valid number greater than 0.");
        }
    }

    if (!form.unitCost.trim()) {
        errors.push("Unit cost is required.");
    } else {
        const unitCost = Number(form.unitCost);
        if (!Number.isFinite(unitCost) || unitCost < 0) {
            errors.push("Unit cost must be a valid number greater than or equal to zero.");
        }
    }

    return errors;
}

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateStockForm({
    mode = "create",
    initialData,
    partOptions = [],
    locationOptions = [],
    purchaseInvoiceOptions = [],
    canSave = true,
    isCatalogLoading = false,
    onCancel,
    onSaved,
}: CreateStockFormProps) {
    const router = useRouter();

    const isEditMode = mode === "edit";

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] = useState<StockFormData>({
        part: initialData?.part ?? "",
        purchaseInvoice: initialData?.purchaseInvoice ?? "",
        destinationLocation:
            initialData?.destinationLocation ?? "",
        quantityReceived:
            initialData?.quantityReceived ?? "",
        unitCost: initialData?.unitCost ?? "",
        batchLotReference:
            initialData?.batchLotReference ?? "",
        notes: initialData?.notes ?? "",
    });

    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const isSubmittingRef = useRef(false);

    const validationSummary = useMemo(
        () => getStockReceiptValidationErrors(form),
        [form],
    );

    // Keep Save enabled until the first attempt so users can see validation errors.
    const canSubmit = canSave && !isSaving && !isCatalogLoading;

    /* ---------------------------------------------------------------------- */
    /* Update Form                                                            */
    /* ---------------------------------------------------------------------- */

    const updateForm = <K extends keyof StockFormData>(
        key: K,
        value: StockFormData[K],
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

        router.push("/inventory/stock-receipt");
    };

    /* ---------------------------------------------------------------------- */
    /* Save                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setHasAttemptedSubmit(true);
        setError("");

        if (validationSummary.length > 0) return;

        if (
            !canSave ||
            isSaving ||
            isCatalogLoading ||
            isSubmittingRef.current
        ) {
            return;
        }

        isSubmittingRef.current = true;

        /* ------------------------------------------------------------------ */
        /* Save                                                                */
        /* ------------------------------------------------------------------ */

        try {
            setIsSaving(true);

            const stock: StockFormData = {
                part: form.part.trim(),
                purchaseInvoice:
                    form.purchaseInvoice.trim(),
                destinationLocation:
                    form.destinationLocation.trim(),
                quantityReceived:
                    form.quantityReceived.trim(),
                unitCost:
                    form.unitCost.trim(),
                batchLotReference:
                    form.batchLotReference.trim(),
                notes: form.notes.trim(),
            };

            if (onSaved) {
                await onSaved(stock);
            } else {
                router.push("/inventory/stock-receipt");
            }
        } catch {
            setError(
                isEditMode
                    ? "Failed to update stock."
                    : "Failed to add stock.",
            );
        } finally {
            setIsSaving(false);
            isSubmittingRef.current = false;
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
            title={isEditMode ? "Edit Stock" : "Add Stock"}
            description="Adds a batch directly to Stock Levels, referencing an existing Purchase invoice."
            actions={
                <FormActions
                    hasAttemptedSubmit={hasAttemptedSubmit}
                    validationSummary={validationSummary}
                    isSaving={isSaving}
                    canSubmit={canSubmit}
                    onCancel={handleCancel}
                    onSave={handleSave}
                    saveLabel={isEditMode ? "Save changes" : "Add"}
                    savingLabel="Saving..."
                />
            }
        >
            {/* ================================================================ */}
            {/* PART + PURCHASE INVOICE                                          */}
            {/* ================================================================ */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Part */}

                <div>
                    <label
                        htmlFor="part"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Part
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="part"
                        value={form.part}
                        onChange={(event) =>
                            updateForm(
                                "part",
                                event.target.value,
                            )
                        }
                        className={`${selectClassName} ${hasAttemptedSubmit && !form.part.trim() ? "border-red-500" : ""}`}
                        aria-invalid={hasAttemptedSubmit && !form.part.trim()}
                    >
                        <option value="">
                            Select part
                        </option>

                        {partOptions.map((part) => (
                            <option
                                key={part.value}
                                value={part.value}
                            >
                                {part.label}
                            </option>
                        ))}
                    </select>
                    {hasAttemptedSubmit && !form.part.trim() && <p className="mt-1 text-xs text-red-600" role="alert">Part is required.</p>}
                </div>

                {/* Purchase Invoice */}

                <div>
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
                        value={form.purchaseInvoice}
                        onChange={(event) =>
                            updateForm(
                                "purchaseInvoice",
                                event.target.value,
                            )
                        }
                        className={`${selectClassName} ${hasAttemptedSubmit && !form.purchaseInvoice.trim() ? "border-red-500" : ""}`}
                        aria-invalid={hasAttemptedSubmit && !form.purchaseInvoice.trim()}
                    >
                        <option value="">
                            Select purchase invoice
                        </option>

                        {purchaseInvoiceOptions.map(
                            (invoice) => (
                                <option
                                    key={invoice.value}
                                    value={invoice.value}
                                >
                                    {invoice.label}
                                </option>
                            ),
                        )}
                    </select>
                    {hasAttemptedSubmit && !form.purchaseInvoice.trim() && <p className="mt-1 text-xs text-red-600" role="alert">Purchase invoice is required.</p>}
                </div>
            </div>

            {/* ================================================================ */}
            {/* LOCATION + QUANTITY                                               */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Destination Location */}

                <div>
                    <label
                        htmlFor="destination-location"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Destination location
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <select
                        id="destination-location"
                        value={form.destinationLocation}
                        onChange={(event) =>
                            updateForm(
                                "destinationLocation",
                                event.target.value,
                            )
                        }
                        className={`${selectClassName} ${hasAttemptedSubmit && !form.destinationLocation.trim() ? "border-red-500" : ""}`}
                        aria-invalid={hasAttemptedSubmit && !form.destinationLocation.trim()}
                    >
                        <option value="">
                            Select location
                        </option>

                        {locationOptions.map(
                            (location) => (
                                <option
                                    key={location.value}
                                    value={location.value}
                                >
                                    {location.label}
                                </option>
                            ),
                        )}
                    </select>
                    {hasAttemptedSubmit && !form.destinationLocation.trim() && <p className="mt-1 text-xs text-red-600" role="alert">Destination location is required.</p>}
                </div>

                {/* Quantity Received */}

                <div>
                    <label
                        htmlFor="quantity-received"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Quantity received
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="quantity-received"
                        type="number"
                        min="1"
                        step="1"
                        value={form.quantityReceived}
                        onChange={(event) =>
                            updateForm(
                                "quantityReceived",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. 20"
                        className={`${inputClassName} ${hasAttemptedSubmit && (!form.quantityReceived.trim() || !Number.isFinite(Number(form.quantityReceived)) || Number(form.quantityReceived) <= 0) ? "border-red-500" : ""}`}
                        aria-invalid={hasAttemptedSubmit && (!form.quantityReceived.trim() || !Number.isFinite(Number(form.quantityReceived)) || Number(form.quantityReceived) <= 0)}
                    />
                    {hasAttemptedSubmit && !form.quantityReceived.trim() && <p className="mt-1 text-xs text-red-600" role="alert">Quantity received is required.</p>}
                    {hasAttemptedSubmit && form.quantityReceived.trim() && (!Number.isFinite(Number(form.quantityReceived)) || Number(form.quantityReceived) <= 0) && <p className="mt-1 text-xs text-red-600" role="alert">Quantity received must be a valid number greater than 0.</p>}
                </div>
            </div>

            {/* ================================================================ */}
            {/* UNIT COST + BATCH / LOT                                          */}
            {/* ================================================================ */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Unit Cost */}

                <div>
                    <label
                        htmlFor="unit-cost"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Unit cost (what was paid)
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    </label>

                    <input
                        id="unit-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.unitCost}
                        onChange={(event) =>
                            updateForm(
                                "unitCost",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. Rs. 340"
                        className={`${inputClassName} ${hasAttemptedSubmit && (!form.unitCost.trim() || !Number.isFinite(Number(form.unitCost)) || Number(form.unitCost) < 0) ? "border-red-500" : ""}`}
                        aria-invalid={hasAttemptedSubmit && (!form.unitCost.trim() || !Number.isFinite(Number(form.unitCost)) || Number(form.unitCost) < 0)}
                    />
                    {hasAttemptedSubmit && !form.unitCost.trim() && <p className="mt-1 text-xs text-red-600" role="alert">Unit cost is required.</p>}
                    {hasAttemptedSubmit && form.unitCost.trim() && (!Number.isFinite(Number(form.unitCost)) || Number(form.unitCost) < 0) && <p className="mt-1 text-xs text-red-600" role="alert">Unit cost must be a valid number greater than or equal to zero.</p>}
                </div>

                {/* Batch / Lot Reference */}

                <div>
                    <label
                        htmlFor="batch-lot-reference"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Batch / lot reference
                        <span className="ml-1 font-normal text-gray-400">
                            (optional)
                        </span>
                    </label>

                    <input
                        id="batch-lot-reference"
                        type="text"
                        value={form.batchLotReference}
                        onChange={(event) =>
                            updateForm(
                                "batchLotReference",
                                event.target.value,
                            )
                        }
                        placeholder="e.g. vendor's dispatch no."
                        className={inputClassName}
                    />
                </div>
            </div>

            {/* ================================================================ */}
            {/* NOTES                                                              */}
            {/* ================================================================ */}

            <div className="mt-4">
                <label
                    htmlFor="notes"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Notes
                    <span className="ml-1 font-normal text-gray-400">
                        (optional)
                    </span>
                </label>

                <input
                    id="notes"
                    type="text"
                    value={form.notes}
                    onChange={(event) =>
                        updateForm(
                            "notes",
                            event.target.value,
                        )
                    }
                    placeholder="e.g. Partial delivery, balance expected next week"
                    className={inputClassName}
                />
            </div>

            {/* ================================================================ */}
            {/* INFORMATION                                                       */}
            {/* ================================================================ */}

            <div className="mt-4 flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <span className="mt-0.5 shrink-0 text-gray-600">
                    i
                </span>

                <p className="leading-5">
                    Stock lands in Stock Levels the moment this is
                    saved — no wait, no QC gate. The Purchase invoice
                    reference is for traceability back to Finance only;
                    it also updates the part&apos;s latest batch cost,
                    which drives Stock Register&apos;s markup pricing.
                </p>
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