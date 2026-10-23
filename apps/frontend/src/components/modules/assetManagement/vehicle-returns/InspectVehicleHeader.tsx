"use client";

import { DashboardStatusPill } from "@/components/dashboard/dashboard-semantic-cell";

export type InspectVehicleHeaderProps = {
    inspectionDisplayNumber: string;
    fleetCode: string;
    registrationNo: string;
    clientName: string;
    contractNumber: string;
    inspectorName?: string | null;
    completedSectionCount: number;
    totalSections: number;
    lastSavedAt: string | null;
    isSaving: boolean;
};

function formatSavedAt(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function saveStatusSuffix(
    lastSavedAt: string | null,
    isSaving: boolean,
): string {
    if (isSaving) return "Saving…";
    const time = formatSavedAt(lastSavedAt);
    if (time) return `autosaved ${time}`;
    return "Not saved yet";
}

export default function InspectVehicleHeader({
    inspectionDisplayNumber,
    fleetCode,
    registrationNo,
    clientName,
    contractNumber,
    inspectorName,
    completedSectionCount,
    totalSections,
    lastSavedAt,
    isSaving,
}: InspectVehicleHeaderProps) {
    const progressPct =
        totalSections > 0
            ? Math.round((completedSectionCount / totalSections) * 100)
            : 0;

    const progressText = `${completedSectionCount} of ${totalSections} sections done · ${saveStatusSuffix(lastSavedAt, isSaving)}`;

    const metaParts = [
        fleetCode,
        registrationNo,
        clientName,
        contractNumber,
    ];
    if (inspectorName?.trim()) {
        metaParts.push(`Inspector ${inspectorName.trim()}`);
    }

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold text-gray-900">
                        Inspection{" "}
                        <span className="font-semibold">
                            {inspectionDisplayNumber}
                        </span>
                    </h1>
                    <DashboardStatusPill
                        label="In inspection"
                        level="violet"
                    />
                </div>
                <p className="text-sm text-gray-500">
                    {metaParts.join(" · ")}
                </p>
            </div>

            <div className="w-full shrink-0 sm:w-56 sm:text-right">
                <p
                    className="text-xs text-gray-600"
                    aria-live="polite"
                    aria-busy={isSaving}
                >
                    {progressText}
                </p>
                <div
                    className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-200"
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Inspection sections completed"
                >
                    <div
                        className="h-full rounded-full bg-[#FE5720] transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
