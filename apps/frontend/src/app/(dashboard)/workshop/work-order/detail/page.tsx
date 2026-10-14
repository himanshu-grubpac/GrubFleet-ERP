import { Suspense } from "react";

import WorkOrderViewPage from "@/components/modules/workshop/WorkOrder/WorkOrderViewPage";

/** Static export (S3): shell; id from ?workOrderId= */
export default function WorkshopWorkOrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading work order…
        </div>
      }
    >
      <WorkOrderViewPage />
    </Suspense>
  );
}
