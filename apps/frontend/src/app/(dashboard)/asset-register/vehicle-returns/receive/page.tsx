import { Suspense } from "react";

import ReceiveReturnedVehiclePage from "@/components/modules/assetManagement/vehicle-returns/ReceiveReturnedVehiclePage";

/** Static export: path-only shell; return inspection id from secure nav store. */
export default function VehicleReturnReceivePage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
                    Loading…
                </div>
            }
        >
            <ReceiveReturnedVehiclePage />
        </Suspense>
    );
}
