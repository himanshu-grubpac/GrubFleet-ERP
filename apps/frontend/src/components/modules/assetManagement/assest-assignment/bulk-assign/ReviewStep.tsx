"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { localTodayIsoDate } from "@/lib/format/date-format";
import Button from "@/components/ui/GrubpacButton";
import type { BulkAssignVehicleValidationRow } from "@/lib/api/asset-register/assignments";
import {
    ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS,
    sanitizeTextValue,
} from "@/lib/forms/restricted-input";
const REVIEW_VEHICLE_PREVIEW = 6;

type ReviewVehicleRow = {
    id: string;
    fleetCode: string;
    registrationNumber: string;
    odometer: number;
};

type ReviewStepProps = {
    summary: {
        clientName: string;
        contractNumber: string;
        assetClassName: string;
        committedQuantity: number;
        allocatedCount: number;
        batchCount: number;
        lineShortBy?: number;
    };
    vehicles: ReviewVehicleRow[];
    validationByVehicleId: Map<string, BulkAssignVehicleValidationRow>;
    conflictCount: number;
    replacementAvailableCount: number;
    validationLoading: boolean;
    autoReplacePending: boolean;
    onRemoveVehicle: (vehicleId: string) => void;
    onRemoveConflicts: () => void;
    onAutoReplaceConflicts: () => void;
    handoverDate: string;
    onHandoverDateChange: (value: string) => void;
    handoverLocation: string;
    onHandoverLocationChange: (value: string) => void;
    notes: string;
    onNotesChange: (value: string) => void;
    onChangeVehicles: () => void;
    onChangeContract?: () => void;
};

function conflictReasonLabel(
    reason: BulkAssignVehicleValidationRow["reason"],
): string {
    switch (reason) {
        case "assigned_elsewhere":
            return "Assigned elsewhere";
        case "in_workshop":
            return "In Workshop";
        case "inactive":
            return "Inactive";
        case "wrong_asset_class":
            return "Wrong class";
        case "not_available":
        default:
            return "Not available";
    }
}

function conflictDetailLine(
    row: BulkAssignVehicleValidationRow,
): string {
    const base = row.fleetCode;
    if (row.reason === "assigned_elsewhere" && row.conflictLabel) {
        return `${base} — assigned to ${row.conflictLabel}`;
    }
    if (row.reason === "in_workshop") {
        return `${base} — in workshop`;
    }
    if (row.reason === "inactive") {
        return `${base} — inactive`;
    }
    return `${base} — ${conflictReasonLabel(row.reason).toLowerCase()}`;
}

export default function ReviewStep({
    summary,
    vehicles,
    validationByVehicleId,
    conflictCount,
    replacementAvailableCount,
    validationLoading,
    autoReplacePending,
    onRemoveVehicle,
    onRemoveConflicts,
    onAutoReplaceConflicts,
    handoverDate,
    onHandoverDateChange,
    handoverLocation,
    onHandoverLocationChange,
    notes,
    onNotesChange,
    onChangeVehicles,
    onChangeContract,
}: ReviewStepProps) {
    const [showAllVehicles, setShowAllVehicles] = useState(false);

    const assignedAfter = summary.allocatedCount + summary.batchCount;
    const fullyAssigned =
        summary.committedQuantity > 0 &&
        assignedAfter >= summary.committedQuantity;
    const greyPct =
        summary.committedQuantity > 0
            ? (summary.allocatedCount / summary.committedQuantity) * 100
            : 0;
    const orangePct =
        summary.committedQuantity > 0
            ? (summary.batchCount / summary.committedQuantity) * 100
            : 0;

    const sortedVehicles = useMemo(() => {
        const copy = [...vehicles];
        copy.sort((a, b) => {
            const aConflict = validationByVehicleId.get(a.id)?.available ===
                false
                ? 0
                : 1;
            const bConflict = validationByVehicleId.get(b.id)?.available ===
                false
                ? 0
                : 1;
            if (aConflict !== bConflict) return aConflict - bConflict;
            return a.fleetCode.localeCompare(b.fleetCode);
        });
        return copy;
    }, [vehicles, validationByVehicleId]);

    const visibleVehicles = showAllVehicles
        ? sortedVehicles
        : sortedVehicles.slice(0, REVIEW_VEHICLE_PREVIEW);

    const conflictRows = sortedVehicles.filter(
        (v) => validationByVehicleId.get(v.id)?.available === false,
    );
    const remainingAfterDropConflicts =
        summary.batchCount - conflictCount;

    const shortageNote =
        typeof summary.lineShortBy === "number" && summary.lineShortBy > 0
            ? `${summary.lineShortBy} unit(s) will remain pending on this line after this batch (register pool shortage).`
            : null;

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
            <div className="space-y-4">
                {conflictCount > 0 ? (
                    <div
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900"
                        role="alert"
                    >
                        <p className="font-semibold">
                            Nothing was assigned — {conflictCount} vehicle
                            {conflictCount === 1 ? "" : "s"} are no longer
                            available.
                        </p>
                        <ul className="mt-2 list-inside list-disc space-y-0.5 text-red-800">
                            {conflictRows.map((row) => {
                                const validation = validationByVehicleId.get(
                                    row.id,
                                );
                                if (!validation) return null;
                                return (
                                    <li key={row.id}>
                                        {conflictDetailLine(validation)}
                                    </li>
                                );
                            })}
                        </ul>
                        {replacementAvailableCount > 0 ? (
                            <p className="mt-2 text-red-800">
                                {replacementAvailableCount} other vehicle
                                {replacementAvailableCount === 1
                                    ? ""
                                    : "s"}{" "}
                                of this class are free to replace them.
                            </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    remainingAfterDropConflicts < 1 ||
                                    validationLoading
                                }
                                onClick={onRemoveConflicts}
                                className="h-8 px-3 text-xs"
                            >
                                Remove them (assign{" "}
                                {Math.max(0, remainingAfterDropConflicts)})
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    conflictCount < 1 ||
                                    replacementAvailableCount < 1 ||
                                    autoReplacePending ||
                                    validationLoading
                                }
                                onClick={onAutoReplaceConflicts}
                                className="h-8 px-3 text-xs"
                            >
                                {autoReplacePending
                                    ? "Replacing…"
                                    : `Auto-replace ${conflictCount}`}
                            </Button>
                        </div>
                    </div>
                ) : null}

                {validationLoading ? (
                    <p className="text-xs text-gray-500" aria-live="polite">
                        Checking vehicle availability…
                    </p>
                ) : null}

                {shortageNote && conflictCount === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                        {shortageNote}
                    </div>
                ) : null}

                <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 text-xs text-gray-700">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-800">
                            Assignment summary
                        </span>
                        {onChangeContract ? (
                            <button
                                type="button"
                                onClick={onChangeContract}
                                className="text-xs font-medium text-[#FE5720] hover:underline"
                            >
                                Edit
                            </button>
                        ) : null}
                    </div>
                    <div className="space-y-1">
                        <p>
                            <span className="font-semibold text-gray-500">
                                Client:
                            </span>{" "}
                            {summary.clientName}
                        </p>
                        <p>
                            <span className="font-semibold text-gray-500">
                                Contract:
                            </span>{" "}
                            {summary.contractNumber}
                        </p>
                        <p>
                            <span className="font-semibold text-gray-500">
                                Asset class line:
                            </span>{" "}
                            {summary.assetClassName}
                        </p>
                        <p>
                            <span className="font-semibold text-gray-500">
                                Vehicles in this batch:
                            </span>{" "}
                            {summary.batchCount}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="font-semibold text-gray-900">
                                Line after assigning: {assignedAfter} /{" "}
                                {summary.committedQuantity} assigned
                            </span>
                            {fullyAssigned ? (
                                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                                    Fully assigned
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <div
                        className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-100"
                        role="presentation"
                    >
                        <div
                            className="h-full bg-gray-400"
                            style={{ width: `${Math.min(100, greyPct)}%` }}
                        />
                        <div
                            className="h-full bg-[#FE5720]"
                            style={{ width: `${Math.min(100, orangePct)}%` }}
                        />
                    </div>
                </div>

                <div className="space-y-3 rounded-lg border border-gray-200 bg-white px-4 py-4">
                    <div>
                        <label
                            htmlFor="bulk-handover-date"
                            className="mb-1 block text-xs font-semibold text-gray-700"
                        >
                            Handover date *
                        </label>
                        <input
                            id="bulk-handover-date"
                            type="date"
                            max={localTodayIsoDate()}
                            value={handoverDate}
                            onChange={(event) =>
                                onHandoverDateChange(event.target.value)
                            }
                            className="h-9 w-full max-w-xs rounded-md border border-gray-300 px-2 text-xs"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="bulk-handover-location"
                            className="mb-1 block text-xs font-semibold text-gray-700"
                        >
                            Handover location{" "}
                            <span className="font-normal text-gray-500">
                                (optional)
                            </span>
                        </label>
                        <RestrictedInput
                            id="bulk-handover-location"
                            restrictedKind="text"
                            maxLength={
                                ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.handoverLocation
                            }
                            value={handoverLocation}
                            onChange={onHandoverLocationChange}
                            className="h-9 text-xs"
                            placeholder="Depot or handover address"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="bulk-assign-notes"
                            className="mb-1 block text-xs font-semibold text-gray-700"
                        >
                            Notes{" "}
                            <span className="font-normal text-gray-500">
                                (optional)
                            </span>
                        </label>
                        <textarea
                            id="bulk-assign-notes"
                            maxLength={ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.notes}
                            value={notes}
                            onChange={(event) =>
                                onNotesChange(
                                    sanitizeTextValue(
                                        event.target.value,
                                        ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.notes,
                                    ),
                                )
                            }
                            rows={3}
                            placeholder="Handover or assignment notes"
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">
                        Selected vehicles ({vehicles.length})
                    </p>
                    <button
                        type="button"
                        onClick={onChangeVehicles}
                        className="text-xs font-medium text-[#FE5720] hover:underline"
                    >
                        Change
                    </button>
                </div>
                <ul className="max-h-[320px] flex-1 divide-y divide-gray-100 overflow-y-auto text-xs">
                    {visibleVehicles.map((row) => {
                        const validation = validationByVehicleId.get(row.id);
                        const isConflict = validation?.available === false;
                        return (
                            <li
                                key={row.id}
                                className={`flex items-start justify-between gap-2 px-3 py-2 ${isConflict ? "bg-red-50/80" : ""}`}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900">
                                        {row.fleetCode}
                                    </p>
                                    <p className="text-gray-600">
                                        {row.registrationNumber}
                                    </p>
                                    {isConflict && validation?.reason ? (
                                        <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
                                            {conflictReasonLabel(
                                                validation.reason,
                                            )}
                                        </span>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    aria-label={`Remove ${row.fleetCode}`}
                                    onClick={() => onRemoveVehicle(row.id)}
                                    className="mt-0.5 shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {vehicles.length > REVIEW_VEHICLE_PREVIEW ? (
                    <div className="border-t border-gray-100 px-3 py-2">
                        <button
                            type="button"
                            onClick={() => setShowAllVehicles((v) => !v)}
                            className="text-xs font-medium text-[#FE5720] hover:underline"
                        >
                            {showAllVehicles
                                ? "Show less"
                                : `Show all ${vehicles.length}`}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
