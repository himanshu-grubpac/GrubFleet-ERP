import { Suspense } from "react";

import AmcSubscriberDetailPage from "@/components/modules/workshop/AmcMaintance/AmcSubscriberDetailPage";

/** Static export (S3): shell; id from ?subscriberCode= */
export default function WorkshopAmcSubscriberDetailRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading subscriber…
        </div>
      }
    >
      <AmcSubscriberDetailPage />
    </Suspense>
  );
}
