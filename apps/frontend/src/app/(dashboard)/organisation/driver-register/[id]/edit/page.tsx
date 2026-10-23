"use client";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { organisationDriverEditHref } from "@/lib/navigation/organisation-static-routes";

export default function DriverLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!driverId) {
      router.replace("/organisation/driver-register/");
      return;
    }
    navigateToEntityShell(
      router,
      organisationDriverEditHref(driverId),
      driverId,
      "replace",
    );
  }, [driverId, router]);

  return <RedirectingState />;
}
