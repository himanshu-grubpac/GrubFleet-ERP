"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterFleetLeaseHistoryHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment � redirect to static-export lease-history shell (?vehicleId=). */
export default function FleetRegisterLegacyLeaseHistoryRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!vehicleId) {
      router.replace("/asset-register/fleetregister");
      return;
    }
    navigateToEntityShell(router, assetRegisterFleetLeaseHistoryHref(vehicleId), vehicleId, 'replace');
  }, [vehicleId, router]);

  return <RedirectingState />;
}
