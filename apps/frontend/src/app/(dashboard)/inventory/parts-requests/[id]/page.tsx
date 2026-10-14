"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { inventoryPartsRequestDetailHref } from "@/lib/navigation/inventory-static-routes";

/** Legacy dynamic segment — redirect to static-export detail shell (?partsRequestId=). */
export default function PartsRequestLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const partsRequestId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!partsRequestId) {
      router.replace("/inventory/parts-requests/");
      return;
    }
    router.replace(inventoryPartsRequestDetailHref(partsRequestId));
  }, [partsRequestId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
