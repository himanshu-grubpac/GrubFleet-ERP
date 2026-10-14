"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { workshopWorkOrderEditHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy dynamic segment — redirect to static-export edit shell (?workOrderId=). */
export default function WorkshopWorkOrderLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!workOrderId) {
      router.replace("/workshop/work-order/");
      return;
    }
    router.replace(workshopWorkOrderEditHref(workOrderId));
  }, [workOrderId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
