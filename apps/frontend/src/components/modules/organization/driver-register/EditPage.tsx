"use client";

import { useParams, useRouter } from "next/navigation";

import CreateDriverPage, {
    type DriverFormData,
} from "@/components/modules/organization/driver-register/CreateDriverPage";

const MOCK_DRIVERS: Array<
    DriverFormData & { id: string }
> = [
        {
            id: "DRV-001",

            name: "Rohit Sharma",

            cprNo: "CPR-10001",

            mobileNo: "+91 98765 43210",

            drivingLicenseNo: "DL-0420110012345",

            licenseExpiryDate: "2028-12-31",

            supplier: "FleetStaff Services",

            email: "rohit.sharma@northgate.example",

            address: {
                line1: "Vikhroli West",
                line2: "",
                city: "Mumbai",
                state: "Maharashtra",
                district: "Mumbai Suburban",
                pincode: "400079",
            },
        },

        {
            id: "DRV-002",

            name: "Amit Verma",

            cprNo: "CPR-10002",

            mobileNo: "+91 99876 54321",

            drivingLicenseNo: "DL-0420110056789",

            licenseExpiryDate: "2029-08-15",

            supplier: "FleetStaff Services",

            email: "amit.verma@example.com",

            address: {
                line1: "Andheri East",
                line2: "",
                city: "Mumbai",
                state: "Maharashtra",
                district: "Mumbai Suburban",
                pincode: "400069",
            },
        },
    ];

export default function EditDriverPage() {
    const params = useParams();
    const router = useRouter();

    const driverId = String(params.id);

    const driver = MOCK_DRIVERS.find(
        (item) => item.id === driverId
    );

    if (!driver) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Driver not found.
                </p>
            </div>
        );
    }

    const handleCancel = () => {
        router.push(
            `/organization/driver-register/${driverId}`
        );
    };

    const handleSaved = async (
        data: DriverFormData
    ) => {
        console.log("Updated driver:", {
            id: driverId,
            ...data,
        });

        router.push(
            `/organization/driver-register/${driverId}`
        );
    };

    return (
        <CreateDriverPage
            initialData={driver}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}