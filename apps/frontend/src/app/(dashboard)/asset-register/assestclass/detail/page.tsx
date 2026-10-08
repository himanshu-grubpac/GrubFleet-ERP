import { Suspense } from "react";

import AssetViewPage from "@/components/modules/assetManagement/asset-register/AssetViewpage";

/** Static export (S3): shell; id from ?assetClassId= */
export default function AssetClassDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading asset class…
        </div>
      }
    >
      <AssetViewPage />
    </Suspense>
  );
}
