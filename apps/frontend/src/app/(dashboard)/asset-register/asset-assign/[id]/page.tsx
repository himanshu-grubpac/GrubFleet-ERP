"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterAssetAssignDetailHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment — redirect to static-export detail shell (?vehicleId=). */
export default function AssetAssignLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!vehicleId) {
      router.replace("/asset-register/asset-assign");
      return;
    }
    router.replace(assetRegisterAssetAssignDetailHref(vehicleId));
  }, [vehicleId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
