import { Suspense } from "react";

import SupplierViewPage from "@/components/modules/organization/suppliers/SupplierViewPage";

/** Static export (S3): shell; id from ?supplierId= */
export default function SupplierDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading supplier…
        </div>
      }
    >
      <SupplierViewPage />
    </Suspense>
  );
}
