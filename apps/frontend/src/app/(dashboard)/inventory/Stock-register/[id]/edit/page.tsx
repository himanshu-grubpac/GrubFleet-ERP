"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { inventoryStockRegisterEditHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment � redirect to static-export edit shell (?partId=). */
export default function StockRegisterLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const partId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!partId) {
      router.replace("/inventory/Stock-register/");
      return;
    }
    navigateToEntityShell(router, inventoryStockRegisterEditHref(partId), partId, 'replace');
  }, [partId, router]);

  return <RedirectingState />;
}
