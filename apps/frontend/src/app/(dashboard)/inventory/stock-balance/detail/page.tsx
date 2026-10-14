import { Suspense } from "react";

import StockViewPage from "@/components/modules/inventory/StockBalance/StockViewPage";

/** Static export (S3): shell; id from ?partId= */
export default function StockBalanceDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading stock balance…
        </div>
      }
    >
      <StockViewPage />
    </Suspense>
  );
}
