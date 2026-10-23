"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { workshopAmcTierEditHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy path � redirect to static-export tier edit (?tierId=). */
export default function WorkshopAmcTierLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const tierId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!tierId) {
      router.replace("/workshop/amc-maintenance/");
      return;
    }
    navigateToEntityShell(router, workshopAmcTierEditHref(tierId), tierId, 'replace');
  }, [tierId, router]);

  return <RedirectingState />;
}
