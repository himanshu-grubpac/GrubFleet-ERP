"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { inventoryStockReceiptDetailHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment — redirect to static-export detail shell (?receiptId=). */
export default function StockReceiptLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!receiptId) {
      router.replace("/inventory/stock-receipt/");
      return;
    }
    router.replace(inventoryStockReceiptDetailHref(receiptId));
  }, [receiptId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
