"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterAssetMasterDetailHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment — redirect to static-export detail shell (?assetMasterId=). */
export default function AssetMasterLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const assetMasterId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!assetMasterId) {
      router.replace("/asset-register/asset-master");
      return;
    }
    router.replace(assetRegisterAssetMasterDetailHref(assetMasterId));
  }, [assetMasterId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
