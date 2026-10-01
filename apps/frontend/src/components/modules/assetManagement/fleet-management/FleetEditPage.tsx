"use client";

import { useParams, useRouter } from "next/navigation";

import CreateFleetVehicleForm, {
    type FleetVehicleFormData,
} from "@/components/modules/assetManagement/fleet-management/FleetFormPage";

/* -------------------------------------------------------------------------- */
/* Mock Fleet Vehicles                                                        */
/* -------------------------------------------------------------------------- */

const MOCK_FLEET_VEHICLES: Array<
    FleetVehicleFormData & {
        id: string;
        fleetCode: string;
        assetClassName: string;
    }
> = [
        {
            id: "vehicle-001",
            fleetCode: "VH-1001",

            assetClassName: "Petrol Scooter — Standard",

            assetClassId: "asset-class-001",

            purchaseInvoiceId: "invoice-001",

            registrationNumber: "MH04 AB 1001",

            chassisNumber: "MD2A1XX1234567890",

            modelYear: "2023",

            odometerReading: "12480",

            registrationStartDate: "2024-04-01",

            registrationEndDate: "2039-03-31",

            insuranceSupplier: "insurance-001",

            insurancePremium: "3200",

            insuranceStartDate: "2026-03-15",

            insuranceEndDate: "2027-03-14",

            warrantyStartDate: "2023-03-14",

            warrantyEndDate: "2026-03-14",

            notes: "Standard fleet vehicle. No additional notes.",
        },

        {
            id: "vehicle-002",
            fleetCode: "VH-1002",

            assetClassName: "Petrol Scooter — Standard",

            assetClassId: "asset-class-001",

            purchaseInvoiceId: "invoice-002",

            registrationNumber: "MH04 AB 1002",

            chassisNumber: "MD2A1XX1234567891",

            modelYear: "2024",

            odometerReading: "8930",

            registrationStartDate: "2024-04-02",

            registrationEndDate: "2039-04-01",

            insuranceSupplier: "insurance-002",

            insurancePremium: "3400",

            insuranceStartDate: "2026-08-21",

            insuranceEndDate: "2027-08-20",

            warrantyStartDate: "2024-08-20",

            warrantyEndDate: "2026-08-20",

            notes: "Standard fleet vehicle. No additional notes.",
        },
    ];

/* -------------------------------------------------------------------------- */
/* Fleet Edit Page                                                            */
/* -------------------------------------------------------------------------- */

export default function FleetEditPage() {
    const params = useParams();
    const router = useRouter();

    const vehicleId = String(params.id);

    /* ---------------------------------------------------------------------- */
    /* Find Vehicle                                                           */
    /* ---------------------------------------------------------------------- */

    const vehicle = MOCK_FLEET_VEHICLES.find(
        (item) => item.id === vehicleId,
    );

    /* ---------------------------------------------------------------------- */
    /* Not Found                                                              */
    /* ---------------------------------------------------------------------- */

    if (!vehicle) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Fleet vehicle not found.
                </p>
            </div>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Cancel                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleCancel = () => {
        router.push(
            `/asset-register/fleetregister/${vehicleId}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Saved                                                                  */
    /* ---------------------------------------------------------------------- */

    const handleSaved = async (
        data: FleetVehicleFormData,
    ) => {
        console.log("Updated fleet vehicle:", {
            id: vehicleId,
            fleetCode: vehicle.fleetCode,
            assetClassName: vehicle.assetClassName,
            ...data,
        });

        // Mock save for now.
        // Replace this with your update API later.

        router.push(
            `/asset-register/fleetregister/${vehicleId}`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Existing Fleet Form                                                    */
    /* ---------------------------------------------------------------------- */

    return (
        <CreateFleetVehicleForm
            mode="edit"
            initialData={{
                assetClassId: vehicle.assetClassId,

                purchaseInvoiceId:
                    vehicle.purchaseInvoiceId,

                registrationNumber:
                    vehicle.registrationNumber,

                chassisNumber:
                    vehicle.chassisNumber,

                modelYear:
                    vehicle.modelYear,

                odometerReading:
                    vehicle.odometerReading,

                registrationStartDate:
                    vehicle.registrationStartDate,

                registrationEndDate:
                    vehicle.registrationEndDate,

                insuranceSupplier:
                    vehicle.insuranceSupplier,

                insurancePremium:
                    vehicle.insurancePremium,

                insuranceStartDate:
                    vehicle.insuranceStartDate,

                insuranceEndDate:
                    vehicle.insuranceEndDate,

                warrantyStartDate:
                    vehicle.warrantyStartDate,

                warrantyEndDate:
                    vehicle.warrantyEndDate,

                notes: vehicle.notes,
            }}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}