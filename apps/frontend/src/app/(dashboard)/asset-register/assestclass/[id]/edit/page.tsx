"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { assetRegisterAssetClassEditHref } from "@/lib/navigation/asset-register-static-routes";

/** Legacy dynamic segment � redirect to static-export edit shell (?assetClassId=). */
export default function AssetClassLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const assetClassId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!assetClassId) {
      router.replace("/asset-register/assestclass");
      return;
    }
    navigateToEntityShell(router, assetRegisterAssetClassEditHref(assetClassId), assetClassId, 'replace');
  }, [assetClassId, router]);

  return <RedirectingState />;
}
