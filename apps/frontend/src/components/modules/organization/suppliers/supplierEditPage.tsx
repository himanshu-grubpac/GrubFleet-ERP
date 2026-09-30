"use client";

import { useParams, useRouter } from "next/navigation";

import CreateSupplierForm, {
    type SupplierFormData,
} from "@/components/modules/organization/suppliers/CreateSupplierForm";

const MOCK_SUPPLIERS = [
    {
        id: "supplier-001",
        name: "Skyline Parts Distributors",
        type: "Spare Parts",
        status: "active" as const,

        contactPerson: "Meenal Kulkarni",
        phone: "+91 98670 22110",
        email: "meenal@skylineparts.com",
        agreementReference: "AGR-2025-0087",

        address: {
            line1: "MIDC Industrial Estate",
            line2: "",
            city: "Bhiwandi",
            state: "Maharashtra",
            district: "Thane",
            pincode: "421302",
        },
    },
];

export default function EditSupplierPage() {
    const params = useParams();
    const router = useRouter();

    const supplierId = String(params.id);

    const supplier = MOCK_SUPPLIERS.find(
        (item) => item.id === supplierId
    );

    if (!supplier) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Supplier not found.
                </p>
            </div>
        );
    }

    const handleCancel = () => {
        router.push("/organization/suppliers");
    };

    const handleSaved = async (
        data: SupplierFormData
    ) => {
        console.log("Updated supplier:", {
            id: supplierId,
            ...data,
        });

        // Mock save for now
        router.push(
            `/organization/suppliers/${supplierId}`
        );
    };

    return (
        <CreateSupplierForm
            mode="edit"
            initialData={supplier}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}