import { Suspense } from "react";

import FleetViewPage from "@/components/modules/assetManagement/fleet-management/FleetViewPage";

/** Static export (S3): shell; id from ?vehicleId= */
export default function FleetRegisterDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading vehicle…
        </div>
      }
    >
      <FleetViewPage />
    </Suspense>
  );
}
