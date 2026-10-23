import { Suspense } from "react";

import ViewDriverPage from "@/components/modules/organization/driver-register/ViewPage";

/** Static export (S3): shell; id from ?driverId= */
export default function DriverDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading driver…
        </div>
      }
    >
      <ViewDriverPage />
    </Suspense>
  );
}
