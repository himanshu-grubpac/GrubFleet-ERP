import { Suspense } from "react";

import EditClientPage from "@/components/modules/organization/clients/Edit Page";

/** Static export (S3): shell; id from ?clientId= */
export default function ClientEditStaticPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <EditClientPage />
    </Suspense>
  );
}
