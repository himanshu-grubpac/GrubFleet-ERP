"use client";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { organisationLocationEditHref } from "@/lib/navigation/organisation-static-routes";

/** Legacy dynamic segment — redirect to path-only edit shell. */
export default function LocationLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!locationId) {
      router.replace("/organisation/locations/");
      return;
    }
    navigateToEntityShell(
      router,
      organisationLocationEditHref(locationId),
      locationId,
      "replace",
    );
  }, [locationId, router]);

  return <RedirectingState />;
}
