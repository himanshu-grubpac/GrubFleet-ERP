import { Suspense } from "react";

import ViewPage from "@/components/modules/organization/employees/ViewPage";

/** Static export (S3): shell; id from ?employeeId= */
export default function EmployeeDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading employee…
        </div>
      }
    >
      <ViewPage />
    </Suspense>
  );
}
