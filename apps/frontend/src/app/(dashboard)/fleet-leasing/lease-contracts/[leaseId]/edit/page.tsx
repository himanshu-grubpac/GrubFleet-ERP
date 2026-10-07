"use client";

import { useParams } from "next/navigation";

import EditLeaseContractPage from "@/components/modules/fleet-leasing/lease-contracts/EditLeaseContractPage";

export default function EditLeaseContractRoutePage() {
    const params = useParams();
    const leaseId = String(params.leaseId ?? "");

    if (!leaseId) {
        return null;
    }

    return <EditLeaseContractPage leaseId={leaseId} />;
}
