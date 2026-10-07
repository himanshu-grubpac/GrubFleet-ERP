import { Suspense } from "react";

import AssetMasterViewPage from "@/components/modules/assetManagement/asset-Master/MasterViewPage";

/** Static export (S3): shell; id from ?assetMasterId= */
export default function AssetMasterDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading asset master…
        </div>
      }
    >
      <AssetMasterViewPage />
    </Suspense>
  );
}
