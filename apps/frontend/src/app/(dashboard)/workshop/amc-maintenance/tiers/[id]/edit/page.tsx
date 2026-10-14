"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { workshopAmcTierEditHref } from "@/lib/navigation/workshop-static-routes";

/** Legacy path — redirect to static-export tier edit (?tierId=). */
export default function WorkshopAmcTierLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const tierId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!tierId) {
      router.replace("/workshop/amc-maintenance/");
      return;
    }
    router.replace(workshopAmcTierEditHref(tierId));
  }, [tierId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
