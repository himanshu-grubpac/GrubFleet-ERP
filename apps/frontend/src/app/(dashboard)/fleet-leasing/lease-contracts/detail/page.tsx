import { Suspense } from "react";
import LeaseContractDetails from "@/components/modules/fleet-leasing/lease-contracts/LeaseContractDetails";

/** Static export (S3): single shell; lease id from ?leaseId= or CloudFront rewrite on legacy paths. */
export default function LeaseContractDetailPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
                    Loading contract…
                </div>
            }
        >
            <LeaseContractDetails />
        </Suspense>
    );
}
