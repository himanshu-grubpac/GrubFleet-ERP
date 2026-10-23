"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { localTodayIsoDate } from "@/lib/format/date-format";
import { inventoryStockReceiptListHref } from "@/lib/navigation/inventory-static-routes";

import FormActions from "@/components/common/FormActions";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
  FormFieldInlineError,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { parseRupeeInputToMinor } from "@/lib/format/money-format";
import { INVENTORY_INPUT_LIMITS } from "@/lib/forms/restricted-input";

/** Select value when receipt is not linked to a Finance purchase invoice. */
export const STOCK_RECEIPT_MANUAL_INVOICE = "__manual_unlinked__";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type StockFormData = {
    part: string;
    purchaseInvoice: string;
    purchaseDate: string;
    expiryDate: string;
    destinationLocation: string;
    quantityReceived: string;
    unitCost: string;
    batchLotReference: string;
    notes: string;
    /** Optional free-text ref when purchase invoice is manual / unlinked. */
    purchaseInvoiceManualRef: string;
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
    if (!form.purchaseDate.trim()) errors.push("Purchase date is required.");
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
    } else if (parseRupeeInputToMinor(form.unitCost) === null) {
        errors.push("Unit cost must be a valid amount.");
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
        purchaseDate:
            initialData?.purchaseDate ??
            new Date().toISOString().slice(0, 10),
        expiryDate: initialData?.expiryDate ?? "",
        destinationLocation:
            initialData?.destinationLocation ?? "",
        quantityReceived:
            initialData?.quantityReceived ?? "",
        unitCost: initialData?.unitCost ?? "",
        batchLotReference:
            initialData?.batchLotReference ?? "",
        notes: initialData?.notes ?? "",
        purchaseInvoiceManualRef:
            initialData?.purchaseInvoiceManualRef ?? "",
    });

    const isManualPurchaseInvoice =
        form.purchaseInvoice === STOCK_RECEIPT_MANUAL_INVOICE;

    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const isSubmittingRef = useRef(false);

    const validationSummary = useMemo(
        () => getStockReceiptValidationErrors(form),
        [form],
    );

    const canSubmit =
        canSave &&
        !isSaving &&
        !isCatalogLoading &&
        validationSummary.length === 0;

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

        router.push(inventoryStockReceiptListHref);
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
                purchaseDate: form.purchaseDate.trim(),
                expiryDate: form.expiryDate.trim(),
                destinationLocation:
                    form.destinationLocation.trim(),
                quantityReceived:
                    form.quantityReceived.trim(),
                unitCost:
                    form.unitCost.trim(),
                batchLotReference:
                    form.batchLotReference.trim(),
                notes: form.notes.trim(),
                purchaseInvoiceManualRef:
                    form.purchaseInvoiceManualRef.trim(),
            };

            if (onSaved) {
                await onSaved(stock);
            } else {
                router.push(inventoryStockReceiptListHref);
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
                            updateForm("part", event.target.value)
                        }
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit && !form.part.trim(),
                            selectClassName,
                        )}
                        aria-invalid={
                            hasAttemptedSubmit && !form.part.trim()
                        }
                    >
                        <option value="">Select part</option>
                        {partOptions.map((part) => (
                            <option key={part.value} value={part.value}>
                                {part.label}
                            </option>
                        ))}
                    </select>
                    {hasAttemptedSubmit && !form.part.trim() ? (
                        <FormFieldInlineError message="Part is required." />
                    ) : null}
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
                        onChange={(event) => {
                            const nextValue = event.target.value;
                            updateForm("purchaseInvoice", nextValue);
                            if (nextValue !== STOCK_RECEIPT_MANUAL_INVOICE) {
                                updateForm("purchaseInvoiceManualRef", "");
                            }
                        }}
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit &&
                                !form.purchaseInvoice.trim(),
                            selectClassName,
                        )}
                        aria-invalid={
                            hasAttemptedSubmit &&
                            !form.purchaseInvoice.trim()
                        }
                    >
                        <option value="">Select purchase invoice</option>
                        {purchaseInvoiceOptions.map((invoice) => (
                            <option
                                key={invoice.value}
                                value={invoice.value}
                            >
                                {invoice.label}
                            </option>
                        ))}
                    </select>
                    {hasAttemptedSubmit && !form.purchaseInvoice.trim() ? (
                        <FormFieldInlineError message="Purchase invoice is required." />
                    ) : null}
                </div>
            </div>

            {isManualPurchaseInvoice ? (
                <div className="mt-4">
                    <label
                        htmlFor="manual-purchase-invoice-ref"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Manual invoice reference
                        <span className="ml-1 font-normal text-gray-400">
                            (optional)
                        </span>
                    </label>
                    <RestrictedInput
                        id="manual-purchase-invoice-ref"
                        restrictedKind="text"
                        maxLength={
                            INVENTORY_INPUT_LIMITS.stockReceiptPurchaseInvoiceRef
                        }
                        value={form.purchaseInvoiceManualRef}
                        onChange={(value) =>
                            updateForm("purchaseInvoiceManualRef", value)
                        }
                        placeholder="e.g. vendor invoice no. if not in Finance"
                        className={inputClassName}
                    />
                </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="purchase-date"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Purchase date
                        <span className="ml-1 text-red-500">*</span>
                    </label>
                    <input
                        id="purchase-date"
                        type="date"
                        max={localTodayIsoDate()}
                        value={form.purchaseDate}
                        onChange={(event) =>
                            updateForm("purchaseDate", event.target.value)
                        }
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit && !form.purchaseDate.trim(),
                            inputClassName,
                        )}
                        aria-invalid={
                            hasAttemptedSubmit && !form.purchaseDate.trim()
                        }
                    />
                    {hasAttemptedSubmit && !form.purchaseDate.trim() && (
                        <FormFieldInlineError message="Purchase date is required." />
                    )}
                </div>
                <div>
                    <label
                        htmlFor="expiry-date"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Expiry date
                        <span className="ml-1 font-normal text-gray-400">
                            (optional)
                        </span>
                    </label>
                    <input
                        id="expiry-date"
                        type="date"
                        min={form.purchaseDate || undefined}
                        value={form.expiryDate}
                        onChange={(event) =>
                            updateForm("expiryDate", event.target.value)
                        }
                        className={inputClassName}
                    />
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
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit &&
                                !form.destinationLocation.trim(),
                            selectClassName,
                        )}
                        aria-invalid={
                            hasAttemptedSubmit &&
                            !form.destinationLocation.trim()
                        }
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
                    {hasAttemptedSubmit && !form.destinationLocation.trim() ? (
                        <FormFieldInlineError message="Destination location is required." />
                    ) : null}
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

                    <RestrictedInput
                        id="quantity-received"
                        restrictedKind="digits"
                        maxLength={
                            INVENTORY_INPUT_LIMITS.stockReceiptQuantityMaxDigits
                        }
                        value={form.quantityReceived}
                        onChange={(value) =>
                            updateForm("quantityReceived", value)
                        }
                        placeholder="e.g. 20"
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit &&
                                (!form.quantityReceived.trim() ||
                                    !Number.isFinite(
                                        Number(form.quantityReceived),
                                    ) ||
                                    Number(form.quantityReceived) <= 0),
                            inputClassName,
                        )}
                        aria-invalid={
                            hasAttemptedSubmit &&
                            (!form.quantityReceived.trim() ||
                                !Number.isFinite(Number(form.quantityReceived)) ||
                                Number(form.quantityReceived) <= 0)
                        }
                    />
                    {hasAttemptedSubmit && !form.quantityReceived.trim() ? (
                        <FormFieldInlineError message="Quantity received is required." />
                    ) : null}
                    {hasAttemptedSubmit &&
                    form.quantityReceived.trim() &&
                    (!Number.isFinite(Number(form.quantityReceived)) ||
                        Number(form.quantityReceived) <= 0) ? (
                        <FormFieldInlineError message="Quantity received must be a valid number greater than 0." />
                    ) : null}
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

                    <RestrictedInput
                        id="unit-cost"
                        restrictedKind="inrRupee"
                        value={form.unitCost}
                        onChange={(value) => updateForm("unitCost", value)}
                        placeholder="e.g. 340"
                        className={mergeFormControlBorderClass(
                            hasAttemptedSubmit &&
                                (!form.unitCost.trim() ||
                                    parseRupeeInputToMinor(form.unitCost) ===
                                        null),
                            inputClassName,
                        )}
                        aria-invalid={
                            hasAttemptedSubmit &&
                            (!form.unitCost.trim() ||
                                parseRupeeInputToMinor(form.unitCost) === null)
                        }
                    />
                    {hasAttemptedSubmit && !form.unitCost.trim() && (
                        <FormFieldInlineError message="Unit cost is required." />
                    )}
                    {hasAttemptedSubmit &&
                        form.unitCost.trim() &&
                        parseRupeeInputToMinor(form.unitCost) === null && (
                            <FormFieldInlineError message="Unit cost must be a valid amount." />
                        )}
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

                    <RestrictedInput
                        id="batch-lot-reference"
                        restrictedKind="text"
                        maxLength={INVENTORY_INPUT_LIMITS.stockReceiptBatchLot}
                        value={form.batchLotReference}
                        onChange={(value) =>
                            updateForm("batchLotReference", value)
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

                <RestrictedInput
                    id="notes"
                    restrictedKind="text"
                    maxLength={INVENTORY_INPUT_LIMITS.stockReceiptNotes}
                    value={form.notes}
                    onChange={(value) => updateForm("notes", value)}
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