"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import DashboardTable from "@/components/dashboard/DashboardTable";
import OrganizationViewLayout from "@/components/common/OrganizationViewLayout";
import { SubPageBackLink } from "@/components/ui/SubPageBackLink";
import { fetchLeaseContractChangeHistory } from "@/lib/api/lease-contracts";
import { useGrubpacAuth } from "@/lib/auth-context";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";

type HistoryRow = {
    id: string;
    fieldLabel: string;
    fromValue: string;
    toValue: string;
    changedBy: string;
    changedAt: string;
};

function formatChangedWhen(iso: string): string {
    const datePart = iso.slice(0, 10);
    return formatCalendarDateEnIn(datePart);
}

export default function LeaseContractChangeHistoryPage() {
    const searchParams = useSearchParams();
    const leaseId = searchParams.get("leaseId") ?? "";
    const { token, organizationId } = useGrubpacAuth();

    const historyQuery = useQuery({
        queryKey: [
            "lease-contract-change-history",
            organizationId,
            leaseId,
        ],
        queryFn: () => {
            if (!token || !organizationId || !leaseId) {
                throw new Error("Missing auth or contract id");
            }
            return fetchLeaseContractChangeHistory(
                token,
                organizationId,
                leaseId,
            );
        },
        enabled: Boolean(token && organizationId && leaseId),
        ...dashboardListQueryOptions,
    });

    const backHref = leaseId
        ? `/fleet-leasing/lease-contracts/detail/?leaseId=${encodeURIComponent(leaseId)}`
        : "/fleet-leasing/lease-contracts";

    const rows: HistoryRow[] =
        historyQuery.data?.items.map((item) => ({
            id: item.id,
            fieldLabel: item.fieldLabel,
            fromValue: item.fromValue,
            toValue: item.toValue,
            changedBy: item.changedBy,
            changedAt: item.changedAt,
        })) ?? [];

    return (
        <OrganizationViewLayout>
            <SubPageBackLink
                href={backHref}
                label="Back to contract"
                className="mb-4"
            />

            <div className="mb-4">
                <h1 className="text-[15px] font-semibold text-gray-900">
                    Change history
                </h1>
                {historyQuery.data?.contractNumber ? (
                    <p className="mt-1 text-sm text-gray-500">
                        {historyQuery.data.contractNumber}
                    </p>
                ) : null}
            </div>

            {historyQuery.isLoading ? (
                <p className="text-sm text-slate-500" aria-busy="true">
                    Loading change history…
                </p>
            ) : null}

            {historyQuery.isError ? (
                <p className="text-sm text-red-600">
                    Failed to load change history.
                </p>
            ) : null}

            {!historyQuery.isLoading &&
            !historyQuery.isError &&
            rows.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    No field changes recorded yet.
                </p>
            ) : null}

            {rows.length > 0 ? (
                <DashboardTable<HistoryRow>
                    columns={[
                        {
                            key: "fieldLabel",
                            label: "FIELD",
                        },
                        {
                            key: "fromValue",
                            label: "FROM",
                            className: "max-w-[200px]",
                        },
                        {
                            key: "toValue",
                            label: "TO",
                            className: "max-w-[200px]",
                        },
                        {
                            key: "changedBy",
                            label: "CHANGED BY",
                        },
                        {
                            key: "changedAt",
                            label: "WHEN",
                            render: (row) => formatChangedWhen(row.changedAt),
                        },
                    ]}
                    data={rows}
                    getRowKey={(row) => row.id}
                />
            ) : null}
        </OrganizationViewLayout>
    );
}
