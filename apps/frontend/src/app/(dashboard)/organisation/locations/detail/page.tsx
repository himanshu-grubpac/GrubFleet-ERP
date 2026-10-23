import { Suspense } from "react";

import ViewPage from "@/components/modules/organization/locations/ViewPage";

/** Static export (S3): shell; id from ?locationId= */
export default function LocationDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading location…
        </div>
      }
    >
      <ViewPage />
    </Suspense>
  );
}
