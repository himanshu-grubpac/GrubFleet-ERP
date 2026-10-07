"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/GrubpacButton";
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

export type CreateStockFormProps = {
    mode?: "create" | "edit";
    initialData?: Partial<StockFormData>;
    onCancel?: () => void;
    onSaved?: (data: StockFormData) => void | Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

const PART_OPTIONS = [
    "Brake Pad Set (Front+Rear) — PRT-10018",
    "Fuel Filter — PRT-10021",
    "Engine Oil Filter — PRT-10024",
    "Air Filter — PRT-10027",
];

const PURCHASE_INVOICE_OPTIONS = [
    "PINV-2026-0156 — Vertex Auto Components",
    "PINV-2026-0151 — Auto Parts India",
    "PINV-2026-0148 — Fleet Components Ltd.",
    "PINV-2026-0142 — Metro Auto Supplies",
];

const LOCATION_OPTIONS = [
    "Delhi Central Warehouse",
    "Noida Workshop",
    "Lucknow Warehouse",
    "Delhi Service Centre",
];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CreateStockForm({
    mode = "create",
    initialData,
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
        setError("");

        /* ------------------------------------------------------------------ */
        /* Validation                                                         */
        /* ------------------------------------------------------------------ */

        if (!form.part.trim()) {
            setError("Part is required.");
            return;
        }

        if (!form.purchaseInvoice.trim()) {
            setError("Purchase invoice is required.");
            return;
        }

        if (!form.destinationLocation.trim()) {
            setError("Destination location is required.");
            return;
        }

        if (!form.quantityReceived.trim()) {
            setError("Quantity received is required.");
            return;
        }

        const quantityReceived = Number(form.quantityReceived);

        if (
            Number.isNaN(quantityReceived) ||
            quantityReceived <= 0
        ) {
            setError(
                "Quantity received must be a valid number greater than 0.",
            );
            return;
        }

        if (!form.unitCost.trim()) {
            setError("Unit cost is required.");
            return;
        }

        const unitCost = Number(form.unitCost);

        if (
            Number.isNaN(unitCost) ||
            unitCost < 0
        ) {
            setError(
                "Unit cost must be a valid positive number.",
            );
            return;
        }

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
                        className={selectClassName}
                    >
                        <option value="">
                            Select part
                        </option>

                        {PART_OPTIONS.map((part) => (
                            <option
                                key={part}
                                value={part}
                            >
                                {part}
                            </option>
                        ))}
                    </select>
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
                        className={selectClassName}
                    >
                        <option value="">
                            Select purchase invoice
                        </option>

                        {PURCHASE_INVOICE_OPTIONS.map(
                            (invoice) => (
                                <option
                                    key={invoice}
                                    value={invoice}
                                >
                                    {invoice}
                                </option>
                            ),
                        )}
                    </select>
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
                        className={selectClassName}
                    >
                        <option value="">
                            Select location
                        </option>

                        {LOCATION_OPTIONS.map(
                            (location) => (
                                <option
                                    key={location}
                                    value={location}
                                >
                                    {location}
                                </option>
                            ),
                        )}
                    </select>
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
                        className={inputClassName}
                    />
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
                        className={inputClassName}
                    />
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