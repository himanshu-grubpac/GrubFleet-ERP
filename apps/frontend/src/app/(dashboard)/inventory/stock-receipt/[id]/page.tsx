"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { inventoryStockReceiptDetailHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment � redirect to static-export detail shell (?receiptId=). */
export default function StockReceiptLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!receiptId) {
      router.replace("/inventory/stock-receipt/");
      return;
    }
    navigateToEntityShell(router, inventoryStockReceiptDetailHref(receiptId), receiptId, 'replace');
  }, [receiptId, router]);

  return <RedirectingState />;
}
