"use client";

import { useParams, useRouter } from "next/navigation";

import AddLocationForm from "@/components/modules/organization/locations/AddLocationForm";

export default function EditLocationPage() {
    const params = useParams();
    const router = useRouter();

    const locationId = String(params.id);

    const handleCancel = () => {
        router.push(
            `/organization/locations/${locationId}`
        );
    };

    const handleSaved = () => {
        router.push(
            `/organization/locations/${locationId}`
        );
    };

    return (
        <AddLocationForm
            locationId={locationId}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}