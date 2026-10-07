"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterFleetEditHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment — redirect to static-export edit shell (?vehicleId=). */
export default function FleetRegisterLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!vehicleId) {
      router.replace("/asset-register/fleetregister");
      return;
    }
    router.replace(assetRegisterFleetEditHref(vehicleId));
  }, [vehicleId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
