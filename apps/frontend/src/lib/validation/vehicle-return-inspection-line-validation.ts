import type {
    FleetReturnInspectionLineItemState,
    FleetReturnInspectionSectionId,
} from "@/lib/api/fleet-leasing/returns";
import { FLEET_RETURN_INSPECTION_INPUT_LIMITS } from "@/lib/forms/restricted-input";
export function inspectionDamageFieldErrors(
    sectionId: FleetReturnInspectionSectionId,
    itemKey: string,
    row: FleetReturnInspectionLineItemState,
): Record<string, string> {
    const errors: Record<string, string> = {};
    if (row.rating !== "minor" && row.rating !== "major") {
        return errors;
    }
    if (!row.attribution) {
        errors[`line:${sectionId}:${itemKey}:attribution`] =
            "Select attribution for this item.";
    }
    const noteTrim = row.note?.trim() ?? "";
    if (!noteTrim) {
        errors[`line:${sectionId}:${itemKey}:note`] =
            "Describe the damage or missing item.";
    } else if (
        noteTrim.length > FLEET_RETURN_INSPECTION_INPUT_LIMITS.lineNote
    ) {
        errors[`line:${sectionId}:${itemKey}:note`] = "Note is too long.";
    }
    if (row.attribution && row.attribution !== "missing") {
        if (row.repairCostMinor == null || row.repairCostMinor <= 0) {
            errors[`line:${sectionId}:${itemKey}:repairCost`] =
                "Enter a repair estimate greater than zero.";
        } else if (
            row.repairCostMinor >
            FLEET_RETURN_INSPECTION_INPUT_LIMITS.repairCostMinorMax
        ) {
            errors[`line:${sectionId}:${itemKey}:repairCost`] =
                "Repair estimate exceeds the allowed maximum.";
        }
    } else if (
        row.repairCostMinor != null &&
        row.repairCostMinor >
            FLEET_RETURN_INSPECTION_INPUT_LIMITS.repairCostMinorMax
    ) {
        errors[`line:${sectionId}:${itemKey}:repairCost`] =
            "Repair estimate exceeds the allowed maximum.";
    }
    return errors;
}

export function inspectionDamageLineIsValid(
    row: FleetReturnInspectionLineItemState,
): boolean {
    if (row.rating === "pass") return true;
    if (row.rating !== "minor" && row.rating !== "major") return false;
    return (
        Object.keys(
            inspectionDamageFieldErrors(
                "documents_keys" as FleetReturnInspectionSectionId,
                "_",
                row,
            ),
        ).length === 0
    );
}
