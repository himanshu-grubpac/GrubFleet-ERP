"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { inventoryStockReceiptEditHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment � redirect to static-export edit shell (?receiptId=). */
export default function StockReceiptLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!receiptId) {
      router.replace("/inventory/stock-receipt/");
      return;
    }
    navigateToEntityShell(router, inventoryStockReceiptEditHref(receiptId), receiptId, 'replace');
  }, [receiptId, router]);

  return <RedirectingState />;
}
