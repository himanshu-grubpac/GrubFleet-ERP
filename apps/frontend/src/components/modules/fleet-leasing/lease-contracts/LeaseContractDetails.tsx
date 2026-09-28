"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import LeaseContractHeader, {
    type LeaseContractStatus,
} from "./LeaseContractHeader";

import LeaseAssetClassTable from "./LeaseAssetClassTable";
import LeaseContractTerms from "./LeaseContractTerms";
import LeaseDeactivationNotice from "./LeaseDeactivationNotice";

export default function LeaseContractDetails() {
    const params = useParams();
    const router = useRouter();

    const leaseId = params.leaseId as string;

    // ============================================================
    // MOCK CONTRACT DATA
    // Later this will come from the API using leaseId
    // ============================================================

    const status: LeaseContractStatus =
        leaseId === "LC-2041" ? "Active" : "Deactivated";

    const description =
        status === "Active"
            ? "Fleet & Leasing contract with Meridian Logistics Pvt. Ltd. Reactivated."
            : "Fleet & Leasing contract with Meridian Logistics Pvt. Ltd. Deactivated.";

    // ============================================================
    // ACTION HANDLERS
    // Later these will call backend APIs
    // ============================================================

    const handleActivate = () => {
        console.log("Activate lease contract:", leaseId);
    };

    const handleDeactivate = () => {
        console.log("Deactivate lease contract:", leaseId);
    };

    const handleReactivate = () => {
        console.log("Reactivate lease contract:", leaseId);
    };

    const handleTerminate = () => {
        console.log("Terminate lease contract:", leaseId);
    };

    const handleEdit = () => {
        router.push(
            `/fleet-leasing/lease-contracts/${leaseId}/edit`,
        );
    };

    return (
        <div className="space-y-6">

            {/* =====================================================
                BREADCRUMB
            ====================================================== */}

            <div className="flex items-center gap-2 text-sm">
                <Link
                    href="/fleet-leasing"
                    className="text-slate-500 hover:text-[#FE5720]"
                >
                    Fleet & Leasing
                </Link>

                <ChevronRight className="h-4 w-4 text-slate-400" />

                <Link
                    href="/fleet-leasing/lease-contracts"
                    className="text-slate-500 hover:text-[#FE5720]"
                >
                    Lease Contracts
                </Link>

                <ChevronRight className="h-4 w-4 text-slate-400" />

                <span className="font-semibold text-slate-900">
                    {leaseId}
                </span>
            </div>

            {/* =====================================================
                CONTRACT HEADER
            ====================================================== */}

            <LeaseContractHeader
                contractNumber={leaseId}
                status={status}
                description={description}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
                onTerminate={handleTerminate}
                onEdit={handleEdit}
            />

            {/* =====================================================
                ASSET CLASS LINES
            ====================================================== */}

            <LeaseAssetClassTable />

            {/* =====================================================
                TERMS
            ====================================================== */}

            <LeaseContractTerms
                timePeriod="24 months"
                securityDeposit="Rs. 2,10,000 — whole contract"
                billingFrequency="Monthly"
            />

            {/* =====================================================
                DEACTIVATION NOTICE
            ====================================================== */}

            {status === "Deactivated" && (
                <LeaseDeactivationNotice
                    returnedVehicles={2}
                    totalVehicles={3}
                />
            )}
        </div>
    );
}