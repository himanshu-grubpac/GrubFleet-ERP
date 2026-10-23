"use client";

import Link from "next/link";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import type { AssetRegisterVehicleListItem } from "@/lib/api/asset-register/vehicles";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import {
    bulkAssignLockedVehicleCount,
    bulkAssignSelectionCap,
    isBulkAssignSelectionFull,
    isBulkAssignVehicleRowLocked,
} from "./bulk-assign-vehicle-selection.util";
import { ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS } from "@/lib/forms/restricted-input";

type VehiclesStepProps = {
    summary: {
        clientName: string;
        contractNumber: string;
        assetClassName: string;
        toAssign: number;
        availableNow: number;
    };
    canCreateFleetVehicle: boolean;
    fleetRegisterCreateHref: string;
    onChangeContract: () => void;
    search: string;
    onSearchChange: (value: string) => void;
    showSelectedOnly: boolean;
    onShowSelectedOnlyChange: (value: boolean) => void;
    vehicles: AssetRegisterVehicleListItem[];
    vehiclesLoading: boolean;
    selectedIds: Set<string>;
    onToggleVehicle: (vehicleId: string) => void;
    onAutoSelect: () => void;
    autoSelectPending: boolean;
    onClearSelection: () => void;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

export default function VehiclesStep({
    summary,
    canCreateFleetVehicle,
    fleetRegisterCreateHref,
    onChangeContract,
    search,
    onSearchChange,
    showSelectedOnly,
    onShowSelectedOnlyChange,
    vehicles,
    vehiclesLoading,
    selectedIds,
    onToggleVehicle,
    onAutoSelect,
    autoSelectPending,
    onClearSelection,
    page,
    pageSize,
    totalItems,
    totalPages,
    onPageChange,
}: VehiclesStepProps) {
    const selectedCount = selectedIds.size;
    const toAssign = summary.toAssign;
    const availableNow = summary.availableNow;
    const selectionCap = bulkAssignSelectionCap(toAssign, availableNow);
    const isShortage = availableNow < toAssign && toAssign > 0;
    const pendingOnLine = Math.max(0, toAssign - availableNow);
    const selectionFull = isBulkAssignSelectionFull(selectedCount, selectionCap);
    const lockedCount = selectionFull
        ? bulkAssignLockedVehicleCount(availableNow, selectedCount)
        : 0;
    const allAvailableSelected =
        selectionCap > 0 && selectedCount >= selectionCap;

    const visibleRows = showSelectedOnly
        ? vehicles.filter((row) => selectedIds.has(row.id))
        : vehicles;

    const pageStart =
        totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const pageEnd = showSelectedOnly
        ? visibleRows.length
        : Math.min(page * pageSize, totalItems);

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-xs text-gray-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
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
                                Asset class:
                            </span>{" "}
                            {summary.assetClassName}
                        </p>
                        <p>
                            <span className="font-semibold text-gray-500">
                                To assign:
                            </span>{" "}
                            {summary.toAssign}
                            {" · "}
                            <span className="font-semibold text-gray-500">
                                Available:
                            </span>{" "}
                            <span
                                className={
                                    isShortage
                                        ? "font-semibold text-amber-700"
                                        : undefined
                                }
                            >
                                {summary.availableNow}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onChangeContract}
                        className="text-xs font-medium text-[#FE5720] hover:underline"
                    >
                        Change
                    </button>
                </div>
            </div>

            {isShortage ? (
                <div className="rounded-lg border border-[#FE5720]/30 bg-orange-50 px-3 py-3 text-xs text-gray-800">
                    <p>
                        Only {availableNow} vehicle
                        {availableNow === 1 ? "" : "s"} are available for this
                        line. You can assign {availableNow} now — the other{" "}
                        {pendingOnLine} stay pending on {summary.contractNumber}{" "}
                        and show up here once more vehicles are added to the
                        Fleet Register.
                    </p>
                    {canCreateFleetVehicle ? (
                        <Link
                            href={fleetRegisterCreateHref}
                            className="mt-2 inline-flex text-xs font-semibold text-[#FE5720] hover:underline"
                        >
                            Add vehicle
                        </Link>
                    ) : null}
                </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`text-sm font-semibold ${
                                allAvailableSelected && isShortage
                                    ? "text-[#FE5720]"
                                    : selectionFull && !isShortage
                                      ? "text-green-700"
                                      : "text-gray-900"
                            }`}
                        >
                            {selectedCount} / {toAssign} selected
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={
                                autoSelectPending ||
                                selectionCap <= 0 ||
                                allAvailableSelected
                            }
                            onClick={onAutoSelect}
                            className="h-8 px-3 text-xs"
                        >
                            {allAvailableSelected && isShortage
                                ? `All ${selectionCap} selected`
                                : `Auto-select ${selectionCap}`}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={selectedCount === 0}
                            onClick={onClearSelection}
                            className="h-8 px-3 text-xs"
                        >
                            Clear selection
                        </Button>
                    </div>
                    <p className="text-[11px] text-gray-500">
                        Auto-select picks the oldest vehicles by date added to
                        the register.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <RestrictedInput
                        restrictedKind="text"
                        maxLength={
                            ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS.vehicleListSearch
                        }
                        value={search}
                        onChange={onSearchChange}
                        placeholder="Search fleet code, registration, chassis"
                        className="h-9 min-w-[200px] flex-1 text-xs sm:max-w-xs"
                    />
                    <select
                        value={showSelectedOnly ? "selected" : "all"}
                        onChange={(event) =>
                            onShowSelectedOnlyChange(
                                event.target.value === "selected",
                            )
                        }
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs"
                        aria-label="Show vehicles"
                    >
                        <option value="all">
                            Show: All ({totalItems})
                        </option>
                        <option value="selected">
                            Show: Selected only ({selectedCount})
                        </option>
                    </select>
                </div>
            </div>

            {selectionFull && !isShortage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
                    Selection is full — {selectedCount} of {toAssign}. The other{" "}
                    {lockedCount} are locked. Untick a selected vehicle to swap
                    one in.
                </div>
            ) : selectedCount === 0 ? (
                <p className="text-xs text-gray-500">
                    Select at least 1 vehicle to continue
                </p>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full text-left text-xs">
                    <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="px-3 py-2" />
                            <th className="px-3 py-2">Fleet code</th>
                            <th className="px-3 py-2">Registration</th>
                            <th className="px-3 py-2">Chassis</th>
                            <th className="px-3 py-2">Model year</th>
                            <th className="px-3 py-2">Odometer</th>
                            <th className="px-3 py-2">Added</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {vehiclesLoading ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-6 text-center text-gray-500"
                                >
                                    Loading vehicles…
                                </td>
                            </tr>
                        ) : visibleRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-6 text-center text-gray-500"
                                >
                                    No vehicles match your filters.
                                </td>
                            </tr>
                        ) : (
                            visibleRows.map((row) => {
                                const isSelected = selectedIds.has(row.id);
                                const rowLocked = isBulkAssignVehicleRowLocked(
                                    isSelected,
                                    selectedCount,
                                    selectionCap,
                                );
                                return (
                                    <tr
                                        key={row.id}
                                        className={
                                            rowLocked
                                                ? "bg-gray-50 opacity-60"
                                                : undefined
                                        }
                                    >
                                        <td className="px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={rowLocked}
                                                onChange={() =>
                                                    onToggleVehicle(row.id)
                                                }
                                            />
                                        </td>
                                        <td className="px-3 py-2 font-medium text-gray-900">
                                            {row.fleetCode}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.registrationNumber}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.chassisNumber}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.modelYear}
                                        </td>
                                        <td className="px-3 py-2">
                                            {row.odometer.toLocaleString(
                                                "en-IN",
                                            )}{" "}
                                            km
                                        </td>
                                        <td className="px-3 py-2">
                                            {formatCalendarDateEnIn(
                                                row.addedToRegisterDate,
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!showSelectedOnly && totalItems > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                    <span>
                        Showing {pageStart}–{pageEnd} of {totalItems}
                    </span>
                    {totalPages > 1 ? (
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={page <= 1}
                                onClick={() => onPageChange(page - 1)}
                                className="h-8 px-3"
                            >
                                Previous
                            </Button>
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={page >= totalPages}
                                onClick={() => onPageChange(page + 1)}
                                className="h-8 px-3"
                            >
                                Next
                            </Button>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
