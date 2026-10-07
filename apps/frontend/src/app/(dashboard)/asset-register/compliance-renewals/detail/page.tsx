import { Suspense } from "react";

import ComplianceFormPage from "@/components/modules/assetManagement/Compliance-Renewals/ComplianceFormPage";

/** Static export (S3): shell; id from ?vehicleId= */
export default function ComplianceRenewalDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
          Loading compliance…
        </div>
      }
    >
      <ComplianceFormPage />
    </Suspense>
  );
}
