import { Suspense } from "react";

import FleetLeaseHistoryPage from "@/components/modules/assetManagement/fleet-management/FleetLeasePage";

/** Static export (S3): shell; id from ?vehicleId= */
export default function FleetRegisterLeaseHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading lease history…
        </div>
      }
    >
      <FleetLeaseHistoryPage />
    </Suspense>
  );
}
