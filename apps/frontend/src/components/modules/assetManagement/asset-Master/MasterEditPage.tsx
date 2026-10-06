"use client";

import { useParams, useRouter } from "next/navigation";

import CreateAssetMasterForm, {
    type AssetMasterFormData,
} from "@/components/modules/assetManagement/asset-Master/CreateAssetMasterForm";

/* -------------------------------------------------------------------------- */
/* Mock Asset Master Records                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_ASSET_MASTERS: Array<
    AssetMasterFormData & {
        id: string;
        assetCode: string;
        status: "Active" | "Inactive";
    }
> = [
    {
        id: "asset-001",
        assetCode: "AST-1001",

        assetClassId: "asset-class-001",
        assetClassName: "Petrol Scooter — Standard",

        vehicleName: "Activa 6G",

        vehicleType: "2-Wheeler",
        fuelType: "Petrol",

        mileageFrom: "40",
        mileageTo: "50",
        mileageUnit: "km/L",

        fuelTankCapacity: "5.5",

        ratedLoadCapacityFrom: "150",
        ratedLoadCapacityTo: "250",

        defaultIntakeChecklist:
            "Standard Intake Checklist",

        notes:
            "Company-owned scooter used for local deliveries.",

        status: "Active",
    },

    {
        id: "asset-002",
        assetCode: "AST-1002",

        assetClassId: "asset-class-001",
        assetClassName: "Petrol Scooter — Standard",

        vehicleName: "Activa 6G Black",

        vehicleType: "2-Wheeler",
        fuelType: "Petrol",

        mileageFrom: "40",
        mileageTo: "50",
        mileageUnit: "km/L",

        fuelTankCapacity: "5.5",

        ratedLoadCapacityFrom: "150",
        ratedLoadCapacityTo: "250",

        defaultIntakeChecklist:
            "Standard Intake Checklist",

        notes:
            "Black Activa assigned for city delivery operations.",

        status: "Active",
    },

    {
        id: "asset-003",
        assetCode: "AST-1003",

        assetClassId: "asset-class-001",
        assetClassName: "Petrol Scooter — Standard",

        vehicleName: "Activa 6G White",

        vehicleType: "2-Wheeler",
        fuelType: "Petrol",

        mileageFrom: "40",
        mileageTo: "50",
        mileageUnit: "km/L",

        fuelTankCapacity: "5.5",

        ratedLoadCapacityFrom: "150",
        ratedLoadCapacityTo: "250",

        defaultIntakeChecklist:
            "Standard Intake Checklist",

        notes:
            "White Activa used for local transportation.",

        status: "Active",
    },

    {
        id: "asset-004",
        assetCode: "AST-1004",

        assetClassId: "asset-class-002",
        assetClassName: "Diesel Truck — Heavy",

        vehicleName: "Tata 407",

        vehicleType: "4-Wheeler",
        fuelType: "Diesel",

        mileageFrom: "6",
        mileageTo: "10",
        mileageUnit: "km/L",

        fuelTankCapacity: "60",

        ratedLoadCapacityFrom: "1000",
        ratedLoadCapacityTo: "5000",

        defaultIntakeChecklist:
            "Heavy Vehicle Intake Checklist",

        notes:
            "Heavy commercial vehicle used for inter-city logistics.",

        status: "Active",
    },

    {
        id: "asset-005",
        assetCode: "AST-1005",

        assetClassId: "asset-class-003",
        assetClassName: "Electric Scooter — Standard",

        vehicleName: "Ola S1",

        vehicleType: "2-Wheeler",
        fuelType: "Electric",

        mileageFrom: "80",
        mileageTo: "120",
        mileageUnit: "km/kWh",

        fuelTankCapacity: "3",

        ratedLoadCapacityFrom: "100",
        ratedLoadCapacityTo: "180",

        defaultIntakeChecklist:
            "Standard Intake Checklist",

        notes:
            "Electric scooter used for short-distance deliveries.",

        status: "Active",
    },

    {
        id: "asset-006",
        assetCode: "AST-1006",

        assetClassId: "asset-class-003",
        assetClassName: "Electric Scooter — Standard",

        vehicleName: "TVS iQube",

        vehicleType: "2-Wheeler",
        fuelType: "Electric",

        mileageFrom: "80",
        mileageTo: "120",
        mileageUnit: "km/kWh",

        fuelTankCapacity: "3",

        ratedLoadCapacityFrom: "100",
        ratedLoadCapacityTo: "180",

        defaultIntakeChecklist:
            "Standard Intake Checklist",

        notes:
            "Vehicle currently inactive.",

        status: "Inactive",
    },
];

/* -------------------------------------------------------------------------- */
/* Edit Asset Master Page                                                     */
/* -------------------------------------------------------------------------- */

export default function EditAssetMasterPage() {
    const params = useParams();
    const router = useRouter();

    const assetId = String(params.id);

    const asset = MOCK_ASSET_MASTERS.find(
        (item) => item.id === assetId,
    );

    /* ---------------------------------------------------------------------- */
    /* Not Found                                                              */
    /* ---------------------------------------------------------------------- */

    if (!asset) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Asset master not found.
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        router.push(
            `/asset-register/asset-master/${assetId}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Saved                                                                  */
    /* ---------------------------------------------------------------------- */

    const handleSaved = async (
        data: AssetMasterFormData,
    ) => {
        console.log("Updated asset master:", {
            id: assetId,
            assetCode: asset.assetCode,
            ...data,
        });

        // Mock save for now
        router.push(
            `/asset-register/asset-master/${assetId}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Form                                                                   */
    /* ---------------------------------------------------------------------- */

    return (
        <CreateAssetMasterForm
            mode="edit"
            initialData={asset}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}