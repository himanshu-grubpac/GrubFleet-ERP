"use client";

import { useParams, useRouter } from "next/navigation";

import CreateAssetClassForm, {
    type AssetClassFormData,
} from "@/components/modules/assetManagement/asset-register/AssetFormPage";

/* -------------------------------------------------------------------------- */
/* Mock Asset Classes                                                         */
/* -------------------------------------------------------------------------- */

const MOCK_ASSET_CLASSES: Array<
    AssetClassFormData & {
        id: string;
        status: "active" | "inactive";
    }
> = [
        {
            id: "asset-class-001",

            name: "Petrol Scooter — Standard",
            classCode: "PS-STD",

            status: "active",

            vehicleType: "2-Wheeler",
            fuelType: "Petrol",

            mileageFrom: "45",
            mileageTo: "45",
            mileageUnit: "km/L",

            fuelTankCapacity: "5.5",

            ratedLoadCapacityFrom: "150",
            ratedLoadCapacityTo: "150",

            defaultIntakeChecklist:
                "Standard Intake Checklist",

            notes: "Standard petrol scooter class.",
        },

        {
            id: "asset-class-002",

            name: "Petrol Auto — Cargo",
            classCode: "PA-CGO",

            status: "active",

            vehicleType: "3-Wheeler",
            fuelType: "Petrol",

            mileageFrom: "17",
            mileageTo: "17",
            mileageUnit: "km/L",

            fuelTankCapacity: "8",

            ratedLoadCapacityFrom: "500",
            ratedLoadCapacityTo: "500",

            defaultIntakeChecklist:
                "Standard Intake Checklist",

            notes: "Cargo-oriented three-wheeler class.",
        },
    ];

/* -------------------------------------------------------------------------- */
/* Edit Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function EditAssetClassPage() {
    const params = useParams();
    const router = useRouter();

    const assetClassId = String(params.id);

    const assetClass = MOCK_ASSET_CLASSES.find(
        (item) => item.id === assetClassId,
    );

    /* ---------------------------------------------------------------------- */
    /* Not Found                                                              */
    /* ---------------------------------------------------------------------- */

    if (!assetClass) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Asset class not found.
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        router.push(
            `/asset-register/assestclass/${assetClassId}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Saved                                                                  */
    /* ---------------------------------------------------------------------- */

    const handleSaved = async (
        data: AssetClassFormData,
    ) => {
        console.log("Updated asset class:", {
            id: assetClassId,
            ...data,
        });

        // Mock save for now
        router.push(
            `/asset-register/assestclass/${assetClassId}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    return (
        <CreateAssetClassForm
            mode="edit"
            initialData={assetClass}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}