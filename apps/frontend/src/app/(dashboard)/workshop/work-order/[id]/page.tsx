"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { workshopWorkOrderDetailHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy dynamic segment — redirect to static-export detail shell (?workOrderId=). */
export default function WorkshopWorkOrderLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!workOrderId) {
      router.replace("/workshop/work-order/");
      return;
    }
    router.replace(workshopWorkOrderDetailHref(workOrderId));
  }, [workOrderId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
