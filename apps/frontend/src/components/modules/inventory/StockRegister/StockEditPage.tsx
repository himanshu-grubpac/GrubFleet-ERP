"use client";

import { useParams, useRouter } from "next/navigation";

import CreatePartForm, {
    type PartFormData,
} from "@/components/modules/inventory/StockRegister/StockFormRegister";

/* -------------------------------------------------------------------------- */
/* Mock Stock Records                                                         */
/* -------------------------------------------------------------------------- */

const MOCK_STOCK_RECORDS: Array<
    PartFormData & {
        id: string;
        partNumber: string;
    }
> = [
        {
            id: "stock-001",
            partNumber: "PRT-10018",

            name: "Brake Pad Set (Front+Rear)",

            compatibleAssetClasses: [
                "Petrol Scooter — Standard",
                "Petrol Auto — Cargo",
            ],

            unitOfMeasure: "Set",

            retailMarkup: "20",

            wholesaleMarkup: "10",

            threshold: "15",
        },

        {
            id: "stock-002",
            partNumber: "PRT-10019",

            name: "Fuel Filter",

            compatibleAssetClasses: [
                "Petrol Scooter — Standard",
            ],

            unitOfMeasure: "Each",

            retailMarkup: "20",

            wholesaleMarkup: "10",

            threshold: "10",
        },

        {
            id: "stock-003",
            partNumber: "PRT-10020",

            name: "Engine Oil Filter",

            compatibleAssetClasses: [
                "Petrol Scooter — Standard",
                "Electric Scooter — Standard",
            ],

            unitOfMeasure: "Each",

            retailMarkup: "15",

            wholesaleMarkup: "8",

            threshold: "20",
        },
    ];

/* -------------------------------------------------------------------------- */
/* Stock Edit Page                                                            */
/* -------------------------------------------------------------------------- */

export default function StockEditPage() {
    const params = useParams();
    const router = useRouter();

    const stockId = String(params.id);

    /* ---------------------------------------------------------------------- */
    /* Find Stock Record                                                      */
    /* ---------------------------------------------------------------------- */

    const stock = MOCK_STOCK_RECORDS.find(
        (item) => item.id === stockId,
    );

    /* ---------------------------------------------------------------------- */
    /* Stock Not Found                                                        */
    /* ---------------------------------------------------------------------- */

    if (!stock) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Stock record not found.
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        router.push(`/inventory/Stock-register/${stockId}`);
    };

    /* ---------------------------------------------------------------------- */
    /* Save                                                                    */
    /* ---------------------------------------------------------------------- */

    const handleSaved = async (
        data: PartFormData,
    ) => {
        console.log("Updated stock record:", {
            id: stockId,
            partNumber: stock.partNumber,
            ...data,
        });

        /*
         * Mock save for now.
         *
         * When the API is connected, replace this
         * with the update API request.
         */

        router.push(`/inventory/Stock-register/${stockId}`);
    };

    /* ---------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <CreatePartForm
            mode="edit"
            initialData={{
                name: stock.name,

                compatibleAssetClasses:
                    stock.compatibleAssetClasses,

                unitOfMeasure:
                    stock.unitOfMeasure,

                retailMarkup:
                    stock.retailMarkup,

                wholesaleMarkup:
                    stock.wholesaleMarkup,

                threshold:
                    stock.threshold,
            }}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}