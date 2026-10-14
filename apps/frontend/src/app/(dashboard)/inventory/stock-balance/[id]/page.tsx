"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { inventoryStockBalanceDetailHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment — redirect to static-export detail shell (?partId=). */
export default function StockBalanceLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const partId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!partId) {
      router.replace("/inventory/stock-balance/");
      return;
    }
    router.replace(inventoryStockBalanceDetailHref(partId));
  }, [partId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
