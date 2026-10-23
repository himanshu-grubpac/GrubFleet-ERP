"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { workshopWorkOrderEditHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy dynamic segment � redirect to static-export edit shell (?workOrderId=). */
export default function WorkshopWorkOrderLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!workOrderId) {
      router.replace("/workshop/work-order/");
      return;
    }
    navigateToEntityShell(router, workshopWorkOrderEditHref(workOrderId), workOrderId, 'replace');
  }, [workOrderId, router]);

  return <RedirectingState />;
}
