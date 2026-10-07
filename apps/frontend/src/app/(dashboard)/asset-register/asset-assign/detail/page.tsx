import { Suspense } from "react";

import AssetAssignmentViewPage from "@/components/modules/assetManagement/assest-assignment/AssetViewPage";

/** Static export (S3): shell; id from ?vehicleId= */
export default function AssetAssignDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading assignment…
        </div>
      }
    >
      <AssetAssignmentViewPage />
    </Suspense>
  );
}
