import { Suspense } from "react";

import EditEmployeePage from "@/components/modules/organization/employees/EditPage";

/** Static export (S3): shell; id from ?employeeId= */
export default function EmployeeEditStaticPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <EditEmployeePage />
    </Suspense>
  );
}
