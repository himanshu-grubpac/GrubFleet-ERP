import { Suspense } from "react";

import AssetMasterEditPage from "@/components/modules/assetManagement/asset-Master/MasterEditPage";

/** Static export (S3): shell; id from ?assetMasterId= */
export default function AssetMasterEditStaticPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <AssetMasterEditPage />
    </Suspense>
  );
}
