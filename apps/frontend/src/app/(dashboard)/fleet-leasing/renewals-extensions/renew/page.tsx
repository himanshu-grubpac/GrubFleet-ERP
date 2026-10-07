import { Suspense } from "react";
import RenewLeaseContractPage from "@/components/modules/fleet-leasing/renewals-extensions/RenewLeaseContractPage";

export default function RenewLeaseContractRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <RenewLeaseContractPage />
    </Suspense>
  );
}
