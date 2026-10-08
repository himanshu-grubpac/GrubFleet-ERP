import { Suspense } from "react";

import LeaseContractChangeHistoryPage from "@/components/modules/fleet-leasing/lease-contracts/LeaseContractChangeHistoryPage";

/** Static export: lease id via ?leaseId= (same as contract detail). */
export default function LeaseContractChangeHistoryRoutePage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
                    Loading change history…
                </div>
            }
        >
            <LeaseContractChangeHistoryPage />
        </Suspense>
    );
}
