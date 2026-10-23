"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { workshopAmcSubscriberDetailHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy path � redirect to static-export subscriber detail (?subscriberCode=). */
export default function WorkshopAmcSubscriberLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const subscriberCode = String(params.id ?? "").trim();

  useEffect(() => {
    if (!subscriberCode) {
      router.replace("/workshop/amc-maintenance/");
      return;
    }
    navigateToEntityShell(router, workshopAmcSubscriberDetailHref(subscriberCode), subscriberCode, 'replace');
  }, [subscriberCode, router]);

  return <RedirectingState />;
}
