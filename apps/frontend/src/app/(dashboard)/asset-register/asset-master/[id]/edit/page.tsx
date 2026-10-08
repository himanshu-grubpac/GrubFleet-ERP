"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterAssetMasterEditHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment — redirect to static-export edit shell (?assetMasterId=). */
export default function AssetMasterLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const assetMasterId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!assetMasterId) {
      router.replace("/asset-register/asset-master");
      return;
    }
    router.replace(assetRegisterAssetMasterEditHref(assetMasterId));
  }, [assetMasterId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
