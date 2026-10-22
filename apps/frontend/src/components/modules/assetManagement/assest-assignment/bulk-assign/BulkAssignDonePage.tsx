"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import {
    BULK_ASSIGN_DONE_STORAGE_KEY,
    type BulkAssignAssetRegisterVehiclesResult,
} from "@/lib/api/asset-register/assignments";
import { fleetLeaseContractDetailHref } from "@/lib/navigation/fleet-static-routes";

const ASSET_ASSIGN_LIST_HREF = "/asset-register/asset-assign/";
const BULK_ASSIGN_RESTART_HREF = "/asset-register/asset-assign/bulk/";

function readDonePayload(): BulkAssignAssetRegisterVehiclesResult | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(BULK_ASSIGN_DONE_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as BulkAssignAssetRegisterVehiclesResult;
    } catch {
        return null;
    }
}

export default function BulkAssignDonePage() {
    const router = useRouter();
    const [payload, setPayload] = useState<BulkAssignAssetRegisterVehiclesResult | null>(
        null,
    );
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const data = readDonePayload();
        setPayload(data);
        setHydrated(true);
        if (data) {
            sessionStorage.removeItem(BULK_ASSIGN_DONE_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        if (!payload) {
            router.replace(ASSET_ASSIGN_LIST_HREF);
        }
    }, [hydrated, payload, router]);

    if (!hydrated || !payload) {
        return (
            <div className="px-6 py-8 text-sm text-gray-600" aria-busy="true">
                Loading…
            </div>
        );
    }

    const contractId = payload.contractId ?? payload.leaseContractId;
    const lineStatusLabel = payload.fullyAssignedLine
        ? "Fully assigned"
        : "Partially assigned";

    return (
        <OrganizationFormLayout
            title="Bulk assignment complete"
            description=""
            contentVariant="plain"
        >
            <div className="mx-auto max-w-2xl space-y-6 py-4">
                <div className="flex flex-col items-center text-center">
                    <CheckCircle2
                        className="h-12 w-12 text-green-600"
                        aria-hidden
                    />
                    <h2 className="mt-3 text-lg font-semibold text-gray-900">
                        {payload.assignedCount} vehicle
                        {payload.assignedCount === 1 ? "" : "s"} assigned to{" "}
                        {payload.clientName || "client"}
                    </h2>
                    <p className="mt-2 max-w-lg text-sm text-gray-600">
                        {payload.contractNumber} · {payload.assetClassName} ·{" "}
                        {lineStatusLabel} · Handover {payload.handoverDate} ·
                        Available → Leased
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Assigned now
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">
                            {payload.assignedCount}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Line status
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">
                            {payload.lineAllocatedAfter}/{payload.lineCommitted}
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Left in pool (class)
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-gray-900">
                            {payload.remainingInPoolForClass}
                        </p>
                    </div>
                </div>

            </div>

            <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-gray-200 bg-[#f8f8f8] px-4 py-4 sm:-mx-6 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(ASSET_ASSIGN_LIST_HREF)}
                            className="h-9 px-4 text-sm"
                        >
                            Back to Asset Assignment
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                router.push(BULK_ASSIGN_RESTART_HREF)
                            }
                            className="h-9 px-4 text-sm"
                        >
                            Bulk assign more
                        </Button>
                    </div>
                    <Button
                        type="button"
                        onClick={() =>
                            router.push(fleetLeaseContractDetailHref(contractId))
                        }
                        className="h-9 px-5 text-sm"
                    >
                        View contract
                    </Button>
                </div>
            </div>
        </OrganizationFormLayout>
    );
}
