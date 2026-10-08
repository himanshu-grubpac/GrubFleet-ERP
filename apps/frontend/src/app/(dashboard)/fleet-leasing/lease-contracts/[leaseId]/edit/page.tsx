"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { fleetLeaseContractEditHref } from "@/lib/navigation/fleet-static-routes";

/** Legacy dynamic segment — redirect to static-export edit shell (?leaseId=). */
export default function EditLeaseContractLegacyRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const leaseId = String(params.leaseId ?? "").trim();

  useEffect(() => {
    if (!leaseId) {
      router.replace("/fleet-leasing/lease-contracts");
      return;
    }
    router.replace(fleetLeaseContractEditHref(leaseId));
  }, [leaseId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Redirecting…
    </div>
  );
}
