import { Suspense } from "react";

import TierPage from "@/components/modules/workshop/AmcMaintance/tiersPage";

/** Static export (S3): shell; id from ?tierId= */
export default function WorkshopAmcTierDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading tier…
        </div>
      }
    >
      <TierPage />
    </Suspense>
  );
}
