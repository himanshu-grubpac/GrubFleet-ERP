"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { workshopWorkOrderDetailHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy dynamic segment ? redirect to static-export detail shell (?workOrderId=). */
export default function WorkshopWorkOrderLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!workOrderId) {
      router.replace("/workshop/work-order/");
      return;
    }
    navigateToEntityShell(router, workshopWorkOrderDetailHref(workOrderId), workOrderId, 'replace');
  }, [workOrderId, router]);

  return <RedirectingState />;
}
