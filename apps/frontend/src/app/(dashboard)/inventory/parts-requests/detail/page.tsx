import { Suspense } from "react";

import PartsRequestViewPage from "@/components/modules/inventory/PartsRequests/partsViewPage";

/** Static export (S3): shell; id from ?partsRequestId= */
export default function PartsRequestDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading request…
        </div>
      }
    >
      <PartsRequestViewPage />
    </Suspense>
  );
}
