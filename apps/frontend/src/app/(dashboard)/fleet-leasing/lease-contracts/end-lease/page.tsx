import { Suspense } from "react";

import EndLeaseReturnVehiclePage from "@/components/modules/fleet-leasing/lease-contracts/EndLeaseReturnVehiclePage";

/** Static export: path-only shell; lease id from secure nav store. */
export default function LeaseContractEndLeasePage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
                    Loading…
                </div>
            }
        >
            <EndLeaseReturnVehiclePage />
        </Suspense>
    );
}
