"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { inventoryStockBalanceDetailHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment � redirect to static-export detail shell (?partId=). */
export default function StockBalanceLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const partId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!partId) {
      router.replace("/inventory/stock-balance/");
      return;
    }
    navigateToEntityShell(router, inventoryStockBalanceDetailHref(partId), partId, 'replace');
  }, [partId, router]);

  return <RedirectingState />;
}
