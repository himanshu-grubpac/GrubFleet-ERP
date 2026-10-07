"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";

import AddLocationForm from "@/components/modules/organization/locations/AddLocationForm";
import { useOrganisationEntityId } from "@/lib/navigation/use-organisation-entity-id";
import {
  organisationLocationDetailHref,
} from "@/lib/navigation/organisation-static-routes";

function EditLocationFormShell() {
  const router = useRouter();
  const locationId = useOrganisationEntityId("locationId");

  return (
    <AddLocationForm
      locationId={locationId}
      onCancel={() => router.push(organisationLocationDetailHref(locationId))}
      onSaved={() => router.push(organisationLocationDetailHref(locationId))}
    />
  );
}

/** Static export (S3): shell; id from ?locationId= */
export default function EditLocationStaticPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <EditLocationFormShell />
    </Suspense>
  );
}
