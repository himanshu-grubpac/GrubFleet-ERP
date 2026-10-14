"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { workshopAmcSubscriberDetailHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy path — redirect to static-export subscriber detail (?subscriberCode=). */
export default function WorkshopAmcSubscriberLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const subscriberCode = String(params.id ?? "").trim();

  useEffect(() => {
    if (!subscriberCode) {
      router.replace("/workshop/amc-maintenance/");
      return;
    }
    router.replace(workshopAmcSubscriberDetailHref(subscriberCode));
  }, [subscriberCode, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
