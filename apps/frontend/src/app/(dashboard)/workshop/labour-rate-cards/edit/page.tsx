import { Suspense } from "react";

import CreateLaborJobCardForm from "@/components/modules/workshop/labor-job-cards/CreateLaborJobCardForm";

export default function LabourRateCardEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading labour rate card…
        </div>
      }
    >
      <CreateLaborJobCardForm />
    </Suspense>
  );
}
