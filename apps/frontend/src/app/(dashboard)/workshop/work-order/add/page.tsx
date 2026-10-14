import { Suspense } from "react";

import CreateWorkOrder from "@/components/modules/workshop/WorkOrder/CreateWorkOrder";

/** Static export (S3): add-items shell; id from ?workOrderId= */
export default function WorkshopWorkOrderAddPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading work order…
        </div>
      }
    >
      <CreateWorkOrder />
    </Suspense>
  );
}
