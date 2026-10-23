"use client";

import OrganizationDetailCard from "@/components/common/OrganizationDetailCard";
import { DashboardStatusPill } from "@/components/dashboard/dashboard-semantic-cell";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import type { FleetReturnInspectionDetail } from "@/lib/api/fleet-leasing/returns";
import { vehicleReturnClosingReasonLabel } from "./vehicle-return-closing-reason";

const SECTION_TITLE =
    "mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500";

type Props = {
    detail: FleetReturnInspectionDetail;
    statusLabel?: string;
    statusLevel?: "brand" | "amber" | "neutral" | "danger";
    /** Gate-in screen: show handover odometer / allowance / keys from contract. */
    showHandoverContext?: boolean;
};

function formatOdometerKm(value: number | null | undefined): string {
    if (value == null) return "—";
    return `${value.toLocaleString("en-IN")} km`;
}

export default function VehicleReturnExpectedSummaryCard({
    detail,
    statusLabel = "Return pending",
    statusLevel = "brand",
    showHandoverContext = false,
}: Props) {
    const dueDate = detail.expectedReturn.dueDate
        ? formatCalendarDateEnIn(detail.expectedReturn.dueDate)
        : "—";

    return (
        <OrganizationDetailCard>
            <div className="mb-4">
                <DashboardStatusPill label={statusLabel} level={statusLevel} />
            </div>
            <h2 className={SECTION_TITLE}>Expected return</h2>
            <dl className="space-y-3 text-sm">
                <div>
                    <dt className="text-xs text-gray-500">Fleet code</dt>
                    <dd className="font-medium text-gray-900">
                        {detail.fleetCode}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">Registration</dt>
                    <dd className="font-medium text-gray-900">
                        {detail.registrationNo}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">Asset class</dt>
                    <dd className="text-gray-900">{detail.assetClass}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">Client</dt>
                    <dd className="text-gray-900">{detail.clientName}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">Contract</dt>
                    <dd className="text-gray-900">{detail.contractNumber}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">Reason</dt>
                    <dd className="text-gray-900">
                        {vehicleReturnClosingReasonLabel(
                            detail.expectedReturn.closingReason,
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500">Due date</dt>
                    <dd className="text-gray-900">{dueDate}</dd>
                </div>
                {detail.expectedReturn.depotLabel ? (
                    <div>
                        <dt className="text-xs text-gray-500">Depot</dt>
                        <dd className="text-gray-900">
                            {detail.expectedReturn.depotLabel}
                        </dd>
                    </div>
                ) : null}
                {showHandoverContext ? (
                    <>
                        <div>
                            <dt className="text-xs text-gray-500">
                                Odometer at handover
                            </dt>
                            <dd className="text-gray-900">
                                {formatOdometerKm(
                                    detail.expectedReturn.handoverOdometer,
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500">
                                Lease km allowance
                            </dt>
                            <dd className="text-gray-900">
                                {formatOdometerKm(
                                    detail.expectedReturn.leaseKmAllowance,
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500">
                                Keys handed over
                            </dt>
                            <dd className="text-gray-900">
                                {detail.expectedReturn.keysHandedOver ?? "—"}
                            </dd>
                        </div>
                    </>
                ) : null}
            </dl>
        </OrganizationDetailCard>
    );
}
