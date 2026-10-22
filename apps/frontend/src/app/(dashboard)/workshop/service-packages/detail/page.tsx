import { Suspense } from "react";

import LaborJobCardViewPage from "@/components/modules/workshop/labor-job-cards/LaborJobCardViewPage";

export default function LabourRateCardDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading labour rate card…
        </div>
      }
    >
      <LaborJobCardViewPage />
    </Suspense>
  );
}
