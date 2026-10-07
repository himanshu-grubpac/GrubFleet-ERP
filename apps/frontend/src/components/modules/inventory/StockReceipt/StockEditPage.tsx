"use client";

import { useParams, useRouter } from "next/navigation";

import CreateStockForm, {
    type StockFormData,
} from "@/components/modules/inventory/StockReceipt/StockReciptForm";

/* -------------------------------------------------------------------------- */
/* Mock Stock Receipt Records                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_STOCK_RECEIPTS: Array<
    StockFormData & {
        id: string;
        receiptNumber: string;
        partNumber: string;
        status: "Active" | "Inactive";
    }
> = [
        {
            id: "receipt-001",

            receiptNumber: "SR-2026-0012",

            part: "Brake Pad Set (Front+Rear) — PRT-10018",

            partNumber: "PRT-10018",

            purchaseInvoice:
                "PINV-2026-0156 — Vertex Auto Components",

            destinationLocation:
                "Bhiwandi Warehouse",

            quantityReceived: "14",

            unitCost: "340",

            batchLotReference:
                "VTX-BR-0912",

            notes:
                "Initial stock receipt against purchase invoice.",

            status: "Active",
        },

        {
            id: "receipt-002",

            receiptNumber: "SR-2026-0011",

            part: "Tyre — 3.00-10 — PRT-10007",

            partNumber: "PRT-10007",

            purchaseInvoice:
                "PINV-2026-0149 — Silverline Tyres & Rubber Co",

            destinationLocation:
                "Bhiwandi Warehouse",

            quantityReceived: "18",

            unitCost: "950",

            batchLotReference:
                "SLT-2026-08",

            notes:
                "Tyres received in full quantity.",

            status: "Active",
        },

        {
            id: "receipt-003",

            receiptNumber: "SR-2026-0010",

            part: "Chain Sprocket Kit — PRT-10025",

            partNumber: "PRT-10025",

            purchaseInvoice:
                "PINV-2026-0138 — Vertex Auto Components",

            destinationLocation:
                "Bhandup Workshop",

            quantityReceived: "6",

            unitCost: "610",

            batchLotReference:
                "VTX-CSK-0826",

            notes:
                "",

            status: "Active",
        },

        {
            id: "receipt-004",

            receiptNumber: "SR-2026-0009",

            part: "Air Filter — PRT-10033",

            partNumber: "PRT-10033",

            purchaseInvoice:
                "PINV-2026-0163 — Vertex Auto Components",

            destinationLocation:
                "Taloja Warehouse",

            quantityReceived: "30",

            unitCost: "180",

            batchLotReference:
                "VTX-AF-0824",

            notes:
                "Received as scheduled.",

            status: "Active",
        },
    ];

/* -------------------------------------------------------------------------- */
/* Stock Receipt Edit Page                                                    */
/* -------------------------------------------------------------------------- */

export default function StockReceiptEditPage() {
    const params = useParams();
    const router = useRouter();

    const receiptId = String(params.id);

    /* ---------------------------------------------------------------------- */
    /* Find Stock Receipt                                                     */
    /* ---------------------------------------------------------------------- */

    const receipt = MOCK_STOCK_RECEIPTS.find(
        (item) => item.id === receiptId,
    );

    /* ---------------------------------------------------------------------- */
    /* Stock Receipt Not Found                                                */
    /* ---------------------------------------------------------------------- */

    if (!receipt) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Stock receipt not found.
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        router.push(
            `/inventory/stock-receipt/${receiptId}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Save                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleSaved = async (
        data: StockFormData,
    ) => {
        console.log("Updated stock receipt:", {
            id: receiptId,

            receiptNumber:
                receipt.receiptNumber,

            partNumber:
                receipt.partNumber,

            ...data,
        });

        /*
         * Mock save for now.
         *
         * When the API is connected, replace this
         * with the update API request.
         */

        router.push(
            `/inventory/stock-receipt/${receiptId}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <CreateStockForm
            mode="edit"
            initialData={{
                part: receipt.part,

                purchaseInvoice:
                    receipt.purchaseInvoice,

                destinationLocation:
                    receipt.destinationLocation,

                quantityReceived:
                    receipt.quantityReceived,

                unitCost:
                    receipt.unitCost,

                batchLotReference:
                    receipt.batchLotReference,

                notes:
                    receipt.notes,
            }}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}