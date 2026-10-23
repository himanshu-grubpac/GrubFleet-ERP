import { Suspense } from "react";

import ViewClientPage from "@/components/modules/organization/clients/ViewPage";

/** Static export (S3): shell; id from ?clientId= */
export default function ClientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading client…
        </div>
      }
    >
      <ViewClientPage />
    </Suspense>
  );
}
