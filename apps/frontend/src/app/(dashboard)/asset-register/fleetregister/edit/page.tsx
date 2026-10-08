import { Suspense } from "react";

import FleetEditPage from "@/components/modules/assetManagement/fleet-management/FleetEditPage";

/** Static export (S3): shell; id from ?vehicleId= */
export default function FleetRegisterEditStaticPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <FleetEditPage />
    </Suspense>
  );
}
