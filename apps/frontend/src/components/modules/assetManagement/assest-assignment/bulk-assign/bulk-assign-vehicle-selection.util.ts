import type { AssetRegisterVehicleListItem } from "@/lib/api/asset-register/vehicles";

/** Max vehicles the user may select for this contract line. */
export function bulkAssignSelectionCap(
    toAssign: number,
    availableNow: number,
): number {
    return Math.max(0, Math.min(toAssign, availableNow));
}

export function isBulkAssignSelectionFull(
    selectedCount: number,
    selectionCap: number,
): boolean {
    return selectionCap > 0 && selectedCount >= selectionCap;
}

/** Unchecked rows locked when at cap; selected rows stay togglable for swap. */
export function isBulkAssignVehicleRowLocked(
    isSelected: boolean,
    selectedCount: number,
    selectionCap: number,
): boolean {
    return (
        isBulkAssignSelectionFull(selectedCount, selectionCap) && !isSelected
    );
}

/** Count of available vehicles that cannot be selected while selection is full. */
export function bulkAssignLockedVehicleCount(
    availableNow: number,
    selectedCount: number,
): number {
    return Math.max(0, availableNow - selectedCount);
}

export function toggleBulkAssignVehicleSelection(
    selectedIds: Set<string>,
    vehicleId: string,
    selectionCap: number,
): Set<string> {
    const next = new Set(selectedIds);
    if (next.has(vehicleId)) {
        next.delete(vehicleId);
        return next;
    }
    if (next.size >= selectionCap) {
        return selectedIds;
    }
    next.add(vehicleId);
    return next;
}

/** Oldest by added-to-register date first (matches auto-select API sort). */
export function sortVehiclesByAddedDateAsc(
    vehicles: AssetRegisterVehicleListItem[],
): AssetRegisterVehicleListItem[] {
    return [...vehicles].sort((a, b) => {
        const byDate = a.addedToRegisterDate.localeCompare(
            b.addedToRegisterDate,
        );
        if (byDate !== 0) return byDate;
        return a.fleetCode.localeCompare(b.fleetCode);
    });
}

export function pickAutoSelectVehicleIds(
    vehicles: AssetRegisterVehicleListItem[],
    toAssign: number,
    availableNow: number,
): string[] {
    const limit = bulkAssignSelectionCap(toAssign, availableNow);
    if (limit <= 0) return [];
    return sortVehiclesByAddedDateAsc(vehicles)
        .slice(0, limit)
        .map((row) => row.id);
}
