"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { workshopAmcScheduleDetailHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy path � redirect to static-export schedule detail (?scheduleId=). */
export default function WorkshopAmcScheduleLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!scheduleId) {
      router.replace("/workshop/amc-maintenance/");
      return;
    }
    navigateToEntityShell(router, workshopAmcScheduleDetailHref(scheduleId), scheduleId, 'replace');
  }, [scheduleId, router]);

  return <RedirectingState />;
}
