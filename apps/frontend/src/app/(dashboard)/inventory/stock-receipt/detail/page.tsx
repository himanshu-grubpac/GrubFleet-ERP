import { Suspense } from "react";

import StockViewPage from "@/components/modules/inventory/StockReceipt/StockViewPage";

/** Static export (S3): shell; id from ?receiptId= */
export default function StockReceiptDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading receipt…
        </div>
      }
    >
      <StockViewPage />
    </Suspense>
  );
}
