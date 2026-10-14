import { Suspense } from "react";

import StockEditPage from "@/components/modules/inventory/StockRegister/StockEditPage";

/** Static export (S3): shell; id from ?partId= */
export default function StockRegisterEditRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading part…
        </div>
      }
    >
      <StockEditPage />
    </Suspense>
  );
}
