"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterAssetAssignDetailHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment � redirect to static-export detail shell (?vehicleId=). */
export default function AssetAssignLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!vehicleId) {
      router.replace("/asset-register/asset-assign");
      return;
    }
    navigateToEntityShell(router, assetRegisterAssetAssignDetailHref(vehicleId), vehicleId, 'replace');
  }, [vehicleId, router]);

  return <RedirectingState />;
}
