import type { LeaseReturnMethod } from "@/lib/api/lease-contracts";
import type {
    FleetReturnInspectionDisposition,
    FleetReturnInspectionFinalizeDraft,
    FleetReturnInspectionSectionCatalog,
    FleetReturnInspectionSectionId,
    FleetReturnInspectionWorksheet,
    FleetReturnReInspectionWorksheet,
} from "@/lib/api/fleet-leasing/returns";
import {
    FLEET_RETURN_INSPECTION_FINALIZE_INPUT_LIMITS,
    FLEET_RETURN_RECEIVE_INPUT_LIMITS,
    FLEET_RETURN_RE_INSPECTION_INPUT_LIMITS,
} from "@/lib/forms/restricted-input";
import { inspectionSectionIsComplete } from "@/lib/format/vehicle-return-inspection-summary";
import { inspectionDamageFieldErrors } from "@/lib/validation/vehicle-return-inspection-line-validation";

export { inspectionDamageLineIsValid } from "@/lib/validation/vehicle-return-inspection-line-validation";

export type VehicleReturnFieldErrors = Record<string, string>;

export function validateEndLeaseReturnForm(params: {
    leaseEndDate: string;
    expectedReturnBy: string;
    selectedVehicleCount: number;
    returnMethod: LeaseReturnMethod;
    returnDepotLocationId: string;
}): VehicleReturnFieldErrors {
    const errors: VehicleReturnFieldErrors = {};
    if (!params.leaseEndDate.trim()) {
        errors.leaseEndDate = "Lease end date is required.";
    }
    if (!params.expectedReturnBy.trim()) {
        errors.expectedReturnBy = "Expected return by is required.";
    }
    if (
        params.leaseEndDate.trim() &&
        params.expectedReturnBy.trim() &&
        params.leaseEndDate > params.expectedReturnBy
    ) {
        errors.expectedReturnBy =
            "Expected return cannot be before the lease end date.";
    }
    if (params.selectedVehicleCount < 1) {
        errors.vehicles = "Select at least one vehicle to return.";
    }
    if (
        params.returnMethod === "client_depot" &&
        !params.returnDepotLocationId.trim()
    ) {
        errors.returnDepotLocationId = "Select a return depot location.";
    }
    return errors;
}

export function validateReceiveReturnForm(params: {
    receivedAtLocal: string;
    broughtInBy: string;
    odometerReading: number;
    handoverOdometer: number;
    keysReceived: number;
    keysHandedOver: number;
}): VehicleReturnFieldErrors {
    const errors: VehicleReturnFieldErrors = {};
    if (!params.receivedAtLocal.trim()) {
        errors.receivedAtLocal = "Received date and time are required.";
    } else {
        const d = new Date(params.receivedAtLocal);
        if (Number.isNaN(d.getTime())) {
            errors.receivedAtLocal = "Enter a valid received date and time.";
        }
    }
    const broughtTrim = params.broughtInBy.trim();
    if (!broughtTrim) {
        errors.broughtInBy = "Brought in by is required.";
    } else if (
        broughtTrim.length > FLEET_RETURN_RECEIVE_INPUT_LIMITS.broughtInBy
    ) {
        errors.broughtInBy = `Name must be at most ${FLEET_RETURN_RECEIVE_INPUT_LIMITS.broughtInBy} characters.`;
    }
    if (!Number.isFinite(params.odometerReading)) {
        errors.odometerReading = "Enter the current odometer reading.";
    } else if (params.odometerReading < 0) {
        errors.odometerReading = "Odometer cannot be negative.";
    } else if (
        params.odometerReading > FLEET_RETURN_RECEIVE_INPUT_LIMITS.odometerMax
    ) {
        errors.odometerReading = `Odometer cannot exceed ${FLEET_RETURN_RECEIVE_INPUT_LIMITS.odometerMax.toLocaleString("en-IN")} km.`;
    } else if (
        Number.isFinite(params.handoverOdometer) &&
        params.odometerReading < params.handoverOdometer
    ) {
        errors.odometerReading =
            "Odometer cannot be less than the handover reading.";
    }
    if (
        params.keysReceived < 0 ||
        params.keysReceived > params.keysHandedOver
    ) {
        errors.keysReceived = `Keys received must be between 0 and ${params.keysHandedOver}.`;
    }
    return errors;
}

type ValidateInspectionWorksheetOpts = {
    /** Full worksheet — every line rated + damage details complete. */
    complete?: boolean;
    /** Validate one section before Next (all lines rated + damage details). */
    sectionId?: FleetReturnInspectionSectionId;
};

/** Field keys: `line:${sectionId}:${itemKey}:attribution|note|repairCost|rating` */
export function validateInspectionWorksheet(
    catalog: FleetReturnInspectionSectionCatalog[],
    worksheet: FleetReturnInspectionWorksheet,
    opts?: ValidateInspectionWorksheetOpts,
): VehicleReturnFieldErrors {
    const errors: VehicleReturnFieldErrors = {};
    const requireSectionComplete =
        Boolean(opts?.complete) || Boolean(opts?.sectionId);

    for (const section of catalog) {
        if (opts?.sectionId && section.id !== opts.sectionId) {
            continue;
        }
        const items = worksheet.sections[section.id] ?? {};
        for (const item of section.items) {
            const row = items[item.key];
            if (!row || row.rating === "unchecked") {
                if (requireSectionComplete) {
                    errors[`line:${section.id}:${item.key}:rating`] =
                        opts?.complete
                            ? "Rate every item before completing."
                            : "Rate this item before continuing.";
                }
                continue;
            }
            if (row.rating === "pass") continue;
            Object.assign(
                errors,
                inspectionDamageFieldErrors(section.id, item.key, row),
            );
        }
        if (
            opts?.complete &&
            !opts?.sectionId &&
            !inspectionSectionIsComplete(section, items)
        ) {
            errors[`section:${section.id}`] =
                "Complete every line in this section.";
        }
    }
    return errors;
}

export function validateInspectionFinalizeForm(params: {
    draft: FleetReturnInspectionFinalizeDraft;
    complete: boolean;
}): VehicleReturnFieldErrors {
    const errors: VehicleReturnFieldErrors = {};
    const note = params.draft.wearAndTearNote?.trim() ?? "";
    if (
        note.length >
        FLEET_RETURN_INSPECTION_FINALIZE_INPUT_LIMITS.wearAndTearNote
    ) {
        errors.wearAndTearNote = `Note must be at most ${FLEET_RETURN_INSPECTION_FINALIZE_INPUT_LIMITS.wearAndTearNote} characters.`;
    }
    if (params.complete) {
        if (!params.draft.disposition) {
            errors.disposition = "Select where this vehicle goes next.";
        }
        if (!params.draft.inspectorConfirmed) {
            errors.inspectorConfirmed =
                "Confirm you have reviewed charges and disposition.";
        }
        if (
            params.draft.disposition === "send_to_workshop" &&
            params.draft.workshopTargetDate &&
            !/^\d{4}-\d{2}-\d{2}$/.test(params.draft.workshopTargetDate)
        ) {
            errors.workshopTargetDate =
                "Enter a valid workshop target date.";
        }
    }
    return errors;
}

export function suggestDefaultDisposition(
    majorCount: number,
): FleetReturnInspectionDisposition {
    return majorCount > 0 ? "send_to_workshop" : "ready_to_lease";
}

export function validateReInspectionWorksheet(
    worksheet: FleetReturnReInspectionWorksheet,
): VehicleReturnFieldErrors {
    const errors: VehicleReturnFieldErrors = {};
    for (const item of worksheet.items) {
        if (item.rating !== "pass") {
            errors[`item:${item.itemKey}`] =
                "All repaired items must be rated Pass before marking ready.";
        }
    }
    const odometer = worksheet.odometerAfterRoadTest;
    if (odometer == null || !Number.isFinite(odometer)) {
        errors.odometerAfterRoadTest =
            "Enter odometer reading after the road test.";
    } else if (odometer < FLEET_RETURN_RE_INSPECTION_INPUT_LIMITS.odometerMin) {
        errors.odometerAfterRoadTest =
            "Odometer after road test must be at least 1 km.";
    } else if (odometer > FLEET_RETURN_RECEIVE_INPUT_LIMITS.odometerMax) {
        errors.odometerAfterRoadTest = "Odometer reading is too large.";
    }
    const c = worksheet.poolChecklist;
    if (!c.roadTestDone) {
        errors.poolChecklist = "Complete the pool checklist before finishing.";
    } else if (
        !c.washedCleaned ||
        !c.fuelLevelChecked ||
        !c.insuranceValidAck ||
        !c.pucValidAck
    ) {
        errors.poolChecklist = "Complete the pool checklist before finishing.";
    }
    if (worksheet.selectedOutcome !== "ready_to_lease") {
        errors.selectedOutcome = "Select Ready to lease as the outcome.";
    }
    return errors;
}

export function vehicleReturnFormIsValid(
    errors: VehicleReturnFieldErrors,
): boolean {
    return Object.keys(errors).length === 0;
}
