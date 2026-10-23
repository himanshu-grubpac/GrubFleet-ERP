"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { inventoryPartsRequestDetailHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment � redirect to static-export detail shell (?partsRequestId=). */
export default function PartsRequestLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const partsRequestId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!partsRequestId) {
      router.replace("/inventory/parts-requests/");
      return;
    }
    navigateToEntityShell(router, inventoryPartsRequestDetailHref(partsRequestId), partsRequestId, 'replace');
  }, [partsRequestId, router]);

  return <RedirectingState />;
}
