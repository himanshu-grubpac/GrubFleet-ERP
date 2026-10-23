"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";

import { fleetLeaseContractEditHref } from "@/lib/navigation/fleet-static-routes";

/** Legacy dynamic segment � redirect to static-export edit shell (?leaseId=). */
export default function EditLeaseContractLegacyRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const leaseId = String(params.leaseId ?? "").trim();

  useEffect(() => {
    if (!leaseId) {
      router.replace("/fleet-leasing/lease-contracts");
      return;
    }
    navigateToEntityShell(router, fleetLeaseContractEditHref(leaseId), leaseId, 'replace');
  }, [leaseId, router]);

  return <RedirectingState />;
}
