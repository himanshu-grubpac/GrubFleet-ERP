"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterAssetClassDetailHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment — redirect to static-export detail shell (?assetClassId=). */
export default function AssetClassLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const assetClassId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!assetClassId) {
      router.replace("/asset-register/assestclass");
      return;
    }
    router.replace(assetRegisterAssetClassDetailHref(assetClassId));
  }, [assetClassId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
