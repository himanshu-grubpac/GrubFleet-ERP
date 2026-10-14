import { Suspense } from "react";

import StockEditPage from "@/components/modules/inventory/StockReceipt/StockEditPage";

/** Static export (S3): shell; id from ?receiptId= */
export default function StockReceiptEditRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading receipt…
        </div>
      }
    >
      <StockEditPage />
    </Suspense>
  );
}
