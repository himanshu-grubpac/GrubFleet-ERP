import { Suspense } from "react";

import EditDriverPage from "@/components/modules/organization/driver-register/EditPage";

/** Static export (S3): shell; id from ?driverId= */
export default function DriverEditStaticPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <EditDriverPage />
    </Suspense>
  );
}
