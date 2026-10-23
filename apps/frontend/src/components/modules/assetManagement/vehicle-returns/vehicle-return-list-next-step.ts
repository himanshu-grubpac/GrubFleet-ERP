import type {
    FleetReturnListItem,
    FleetReturnNextStepActionKey,
    FleetReturnNextStepPresentation,
    FleetReturnNextStepVariant,
} from "@/lib/api/fleet-leasing/returns";

export type VehicleReturnNextStepKind =
    | "remind"
    | "receive"
    | "start_inspection"
    | "continue_inspection"
    | "finalize_inspection"
    | "reinspect"
    | "view_inspection_result"
    | "view_job"
    | "resolve_hold"
    | "none";

export type VehicleReturnNextStepAction = {
    label: string;
    kind: VehicleReturnNextStepKind;
    variant: FleetReturnNextStepVariant;
    disabled?: boolean;
    disabledTitle?: string;
    workshopJobId?: string | null;
};

const ACTION_KEY_TO_KIND: Record<
    FleetReturnNextStepActionKey,
    VehicleReturnNextStepKind
> = {
    remind_client: "remind",
    receive: "receive",
    start_inspection: "start_inspection",
    continue_inspection: "continue_inspection",
    finalize_inspection: "finalize_inspection",
    reinspect: "reinspect",
    view_inspection_result: "view_inspection_result",
    view_job: "view_job",
    resolve_hold: "resolve_hold",
};

function mapPresentationStep(
    step: FleetReturnNextStepPresentation,
): VehicleReturnNextStepAction {
    return {
        label: step.label,
        kind: ACTION_KEY_TO_KIND[step.actionKey],
        variant: step.variant,
        disabled: !step.enabled,
        disabledTitle: step.reasonDisabled,
        workshopJobId: step.workshopJobId,
    };
}

/** NEXT STEP column — server `nextSteps` only. */
export function vehicleReturnNextStepActions(
    item: FleetReturnListItem,
): VehicleReturnNextStepAction[] {
    return (item.nextSteps ?? []).map(mapPresentationStep);
}

export function grubpacVariantForNextStep(
    variant: FleetReturnNextStepVariant,
): "primary" | "secondary" | "outline" {
    if (variant === "primary") return "primary";
    if (variant === "ghost") return "outline";
    return "secondary";
}

/** Fixed box model for NEXT STEP column — same footprint for every variant. */
const NEXT_STEP_BUTTON_DIMENSIONS =
    "inline-flex h-8 min-h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border box-border px-3 py-0 text-xs font-medium leading-none";

/** Tailwind classes for NEXT STEP `GrubpacButton` (semantic variant unchanged). */
export function vehicleReturnNextStepButtonClass(
    variant: FleetReturnNextStepVariant,
): string {
    if (variant === "ghost") {
        return [
            NEXT_STEP_BUTTON_DIMENSIONS,
            "border-transparent bg-transparent shadow-none text-gray-700 hover:bg-gray-50 disabled:border-transparent disabled:bg-transparent",
        ].join(" ");
    }
    return NEXT_STEP_BUTTON_DIMENSIONS;
}
