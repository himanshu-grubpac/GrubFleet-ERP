"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { inventoryStockRegisterEditHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment — redirect to static-export edit shell (?partId=). */
export default function StockRegisterLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const partId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!partId) {
      router.replace("/inventory/Stock-register/");
      return;
    }
    router.replace(inventoryStockRegisterEditHref(partId));
  }, [partId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
