"use client";

import { useParams, useRouter } from "next/navigation";
import AddLocationForm from "@/components/modules/organization/locations/AddLocationForm";

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;

  return (
    <AddLocationForm
      locationId={locationId}
      onCancel={() => router.push(`/organization/locations/${locationId}`)}
      onSaved={() => router.push(`/organization/locations/${locationId}`)}
    />
  );
}
