"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterFleetEditHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment � redirect to static-export edit shell (?vehicleId=). */
export default function FleetRegisterLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!vehicleId) {
      router.replace("/asset-register/fleetregister");
      return;
    }
    navigateToEntityShell(router, assetRegisterFleetEditHref(vehicleId), vehicleId, 'replace');
  }, [vehicleId, router]);

  return <RedirectingState />;
}
