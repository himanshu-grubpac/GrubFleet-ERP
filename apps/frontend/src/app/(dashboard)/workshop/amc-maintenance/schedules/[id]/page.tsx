"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { workshopAmcScheduleDetailHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy path — redirect to static-export schedule detail (?scheduleId=). */
export default function WorkshopAmcScheduleLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!scheduleId) {
      router.replace("/workshop/amc-maintenance/");
      return;
    }
    router.replace(workshopAmcScheduleDetailHref(scheduleId));
  }, [scheduleId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
