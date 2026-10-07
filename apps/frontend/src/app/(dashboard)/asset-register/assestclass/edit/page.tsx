import { Suspense } from "react";

import AssetEditpage from "@/components/modules/assetManagement/asset-register/AssetEditpage";

/** Static export (S3): shell; id from ?assetClassId= */
export default function AssetClassEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <AssetEditpage />
    </Suspense>
  );
}
