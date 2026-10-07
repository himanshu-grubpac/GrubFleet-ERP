import { Suspense } from "react";

import EditSupplierPage from "@/components/modules/organization/suppliers/supplierEditPage";

/** Static export (S3): shell; id from ?supplierId= */
export default function SupplierEditStaticPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading…
        </div>
      }
    >
      <EditSupplierPage />
    </Suspense>
  );
}
