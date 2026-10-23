import type {
    FleetReturnInspectionLineItemState,
    FleetReturnInspectionSectionCatalog,
    FleetReturnInspectionSummary,
    FleetReturnInspectionWorksheet,
} from "@/lib/api/fleet-leasing/returns";
import { inspectionDamageLineIsValid } from "@/lib/validation/vehicle-return-inspection-line-validation";

/** Mirrors backend worksheet completion rules for one catalog section. */
export function inspectionSectionIsComplete(
    section: FleetReturnInspectionSectionCatalog,
    items:
        | Record<string, FleetReturnInspectionLineItemState>
        | undefined,
): boolean {
    if (!items) return false;
    return section.items.every((item) => {
        const row = items[item.key];
        if (!row || row.rating === "unchecked") return false;
        return inspectionDamageLineIsValid(row);
    });
}

export function countCompletedInspectionSections(
    catalog: FleetReturnInspectionSectionCatalog[],
    worksheet: FleetReturnInspectionWorksheet,
): number {
    return catalog.filter((section) =>
        inspectionSectionIsComplete(
            section,
            worksheet.sections[section.id],
        ),
    ).length;
}

export function countRatedItemsInInspectionSection(
    section: FleetReturnInspectionSectionCatalog,
    items:
        | Record<string, FleetReturnInspectionLineItemState>
        | undefined,
): number {
    if (!items) return 0;
    return section.items.filter((item) => {
        const row = items[item.key];
        return row != null && row.rating !== "unchecked";
    }).length;
}

export function countIssueItemsInInspectionSection(
    section: FleetReturnInspectionSectionCatalog,
    items:
        | Record<string, FleetReturnInspectionLineItemState>
        | undefined,
): number {
    if (!items) return 0;
    let count = 0;
    for (const item of section.items) {
        const row = items[item.key];
        if (row?.rating === "minor" || row?.rating === "major") count += 1;
    }
    return count;
}

export type ComputeFleetReturnInspectionSummaryParams = {
    odometerReading: number;
    handoverOdometer: number | null;
    leaseKmAllowance: number | null;
};

/**
 * Mirrors backend `computeInspectionSummary` / `computeInspectionWorksheetSummary`.
 * Live "So far" panel while editing the worksheet.
 */
export function computeInspectionWorksheetSummary(
    catalog: FleetReturnInspectionSectionCatalog[],
    worksheet: FleetReturnInspectionWorksheet,
    params: ComputeFleetReturnInspectionSummaryParams,
): FleetReturnInspectionSummary {
    let majorCount = 0;
    let minorCount = 0;
    let missingCount = 0;
    let repairEstimateMinor = 0;

    for (const section of catalog) {
        const items = worksheet.sections[section.id] ?? {};
        for (const item of section.items) {
            const row = items[item.key];
            if (!row) continue;
            if (row.rating === "major") majorCount += 1;
            if (row.rating === "minor") minorCount += 1;
            if (row.attribution === "missing") missingCount += 1;
            if (
                typeof row.repairCostMinor === "number" &&
                row.repairCostMinor > 0 &&
                (row.rating === "minor" || row.rating === "major")
            ) {
                repairEstimateMinor += row.repairCostMinor;
            }
        }
    }

    const handover = params.handoverOdometer ?? params.odometerReading;
    const allowance = params.leaseKmAllowance ?? 0;
    const excessKm = Math.max(
        0,
        params.odometerReading - handover - allowance,
    );

    return {
        majorCount,
        minorCount,
        missingCount,
        excessKm,
        repairEstimateMinor,
    };
}

/** @deprecated Prefer `computeInspectionWorksheetSummary` — kept for existing imports. */
export const computeFleetReturnInspectionSummary = computeInspectionWorksheetSummary;
