"use client";

import { Suspense } from "react";

import EditLeaseContractPage from "@/components/modules/fleet-leasing/lease-contracts/EditLeaseContractPage";
import { useFleetEntityId } from "@/lib/navigation/use-fleet-entity-id";

function EditLeaseContractShell() {
  const leaseId = useFleetEntityId("leaseId");

  if (!leaseId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
        Missing lease contract id.
      </div>
    );
  }

  return <EditLeaseContractPage leaseId={leaseId} />;
}

/** Static export (S3): shell; id from ?leaseId= or CloudFront rewrite on legacy paths. */
export default function EditLeaseContractStaticPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <EditLeaseContractShell />
    </Suspense>
  );
}
