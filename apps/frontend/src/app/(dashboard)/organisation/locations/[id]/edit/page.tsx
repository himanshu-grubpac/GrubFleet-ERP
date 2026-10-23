"use client";

import { useParams, useRouter } from "next/navigation";
import AddLocationForm from "@/components/modules/organization/locations/AddLocationForm";
import { organisationLocationDetailHref } from "@/lib/navigation/organisation-static-routes";

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;

  return (
    <AddLocationForm
      locationId={locationId}
      onCancel={() => router.push(organisationLocationDetailHref(locationId))}
      onSaved={() => router.push(organisationLocationDetailHref(locationId))}
    />
  );
}
