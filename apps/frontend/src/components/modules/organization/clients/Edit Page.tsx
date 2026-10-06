"use client";

import { useParams, useRouter } from "next/navigation";

import CreateClientPage, {
    type ClientFormData,
} from "@/components/modules/organization/clients/CreateClientPage";

const MOCK_CLIENTS: Array<
    ClientFormData & { id: string }
> = [
        {
            id: "client-001",

            companyName: "Northgate Freight Services",

            address: {
                line1: "Vikhroli",
                line2: "",
                city: "Mumbai",
                state: "Maharashtra",
                district: "Mumbai Suburban",
                pincode: "400001",
                country: "India",
            },

            pointsOfContact: [
                {
                    id: "contact-001",
                    name: "Priya Menon",
                    contactNumber: "+91 99870 66123",
                    email:
                        "priya.menon@northgatefreight.example",
                    isPrimary: true,
                },
            ],
        },

        {
            id: "client-002",

            companyName: "Metro Logistics Pvt. Ltd.",

            address: {
                line1: "Andheri East",
                line2: "",
                city: "Mumbai",
                state: "Maharashtra",
                district: "Mumbai Suburban",
                pincode: "400069",
                country: "India",
            },

            pointsOfContact: [
                {
                    id: "contact-002",
                    name: "Rahul Sharma",
                    contactNumber: "+91 98765 43210",
                    email:
                        "rahul.sharma@metrologistics.example",
                    isPrimary: true,
                },
            ],
        },
    ];

export default function EditClientPage() {
    const params = useParams();
    const router = useRouter();

    const clientId = String(params.id);

    const client = MOCK_CLIENTS.find(
        (item) => item.id === clientId
    );

    if (!client) {
        return (
            <div className="p-6">
                <p className="text-sm text-gray-500">
                    Client not found.
                </p>
            </div>
        );
    }

    const handleCancel = () => {
        router.push(
            `/organization/clients/${clientId}`
        );
    };

    const handleSaved = async (
        data: ClientFormData
    ) => {
        console.log("Updated client:", {
            id: clientId,
            ...data,
        });

        router.push(
            `/organization/clients/${clientId}`
        );
    };

    return (
        <CreateClientPage
            initialData={client}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}