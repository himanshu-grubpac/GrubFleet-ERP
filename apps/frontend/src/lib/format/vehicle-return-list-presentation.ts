import type {
    FleetReturnListItem,
    FleetReturnListPipelineTab,
} from "@/lib/api/fleet-leasing/returns";
import {
    DASHBOARD_TEXT_SUBDUED_CLASS,
    type DashboardDueDateUrgency,
    type DashboardSemanticLevel,
    getDashboardSemanticDotClass,
    getDashboardSemanticTextClass,
    getDueDatePresentation,
} from "@/lib/format/dashboard-table-semantic-presentation";

/** Semantic stage bucket for Vehicle Returns list (Figma STAGE column). */
export type VehicleReturnStageSemantic =
    | "on_hold"
    | "overdue"
    | "return_pending"
    | "to_inspect"
    | "in_inspection"
    | "repair_done"
    | "in_workshop"
    | "available"
    | "other";

const STAGE_PRESENTATION: Record<
    VehicleReturnStageSemantic,
    { dot: DashboardSemanticLevel; label: DashboardSemanticLevel | "subdued" }
> = {
    on_hold: { dot: "muted", label: "subdued" },
    overdue: { dot: "danger", label: "danger" },
    return_pending: { dot: "brand", label: "neutral" },
    to_inspect: { dot: "info", label: "info" },
    in_inspection: { dot: "violet", label: "violet" },
    repair_done: { dot: "amber", label: "amber" },
    in_workshop: { dot: "amber", label: "amber" },
    available: { dot: "muted", label: "neutral" },
    other: { dot: "muted", label: "neutral" },
};

const STAGE_LABEL_TEXT_OVERRIDES: Partial<
    Record<VehicleReturnStageSemantic, string>
> = {
    available: "text-gray-700",
    other: "text-gray-800",
};

function stageLabelTextClass(
    semantic: VehicleReturnStageSemantic,
): string {
    const override = STAGE_LABEL_TEXT_OVERRIDES[semantic];
    if (override) return override;
    const { label } = STAGE_PRESENTATION[semantic];
    if (label === "subdued") {
        return DASHBOARD_TEXT_SUBDUED_CLASS;
    }
    return getDashboardSemanticTextClass(label);
}

function startOfUtcDayMs(isoDate: string): number {
    const [y, m, d] = isoDate.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
}

export function fleetReturnOverdueDayCount(dueIso: string): number {
    const today = new Date();
    const todayMs = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
    );
    const dueMs = startOfUtcDayMs(dueIso);
    return Math.floor((todayMs - dueMs) / (24 * 60 * 60 * 1000));
}

/** Calendar-overdue while still awaiting physical return. */
export function isFleetReturnDueOverdue(item: FleetReturnListItem): boolean {
    if (item.vehicleStatus !== "return_pending" || !item.expectedReturnDueDate) {
        return false;
    }
    return fleetReturnOverdueDayCount(item.expectedReturnDueDate) > 0;
}

function isReturnOnHold(item: FleetReturnListItem): boolean {
    return (
        item.nextSteps?.some((step) => step.actionKey === "resolve_hold") ??
        false
    );
}

export function formatVehicleReturnDueReceivedShort(isoDate: string): string {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    });
}

/** Figma list STAGE column — short inspector name (e.g. "Mehta P"). */
export function formatVehicleReturnInspectorShortName(
    fullName: string | null | undefined,
): string | null {
    const trimmed = fullName?.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0]!;
    const last = parts[parts.length - 1]!;
    const firstInitial = parts[0]!.charAt(0).toUpperCase();
    return `${last} ${firstInitial}`;
}

export function vehicleReturnStageDetailLine(
    item: FleetReturnListItem,
): string | null {
    if (isReturnOnHold(item)) {
        return null;
    }
    if (
        item.vehicleStatus === "returned" &&
        item.inspectionStatus === "in_progress"
    ) {
        return formatVehicleReturnInspectorShortName(item.inspectorDisplayName);
    }
    if (item.vehicleStatus === "workshop") {
        const eta = item.workshopExpectedCompletionDate?.slice(0, 10);
        if (!eta) return null;
        return `ETA ${formatVehicleReturnDueReceivedShort(eta)}`;
    }
    return null;
}

export function vehicleReturnStageLabel(item: FleetReturnListItem): string {
    if (isReturnOnHold(item)) {
        return "On hold";
    }
    if (
        item.vehicleStatus === "return_pending" &&
        item.expectedReturnDueDate
    ) {
        const days = fleetReturnOverdueDayCount(item.expectedReturnDueDate);
        if (days > 0) {
            return `Overdue ${days} day${days === 1 ? "" : "s"}`;
        }
        return "Return pending";
    }
    if (item.vehicleStatus === "return_pending") {
        return "Return pending";
    }
    if (item.vehicleStatus === "returned") {
        if (item.inspectionStatus === "in_progress") {
            return "In inspection";
        }
        if (item.inspectionStatus === "completed") {
            return "Repair done";
        }
        return "To inspect";
    }
    if (item.vehicleStatus === "workshop") {
        return "In workshop";
    }
    if (item.vehicleStatus === "available") {
        return "Available";
    }
    return item.vehicleStatus.replaceAll("_", " ");
}

export function vehicleReturnStageSemantic(
    item: FleetReturnListItem,
): VehicleReturnStageSemantic {
    if (isReturnOnHold(item)) {
        return "on_hold";
    }
    if (isFleetReturnDueOverdue(item)) {
        return "overdue";
    }
    if (item.vehicleStatus === "return_pending") {
        return "return_pending";
    }
    if (
        item.vehicleStatus === "returned" &&
        item.inspectionStatus === "in_progress"
    ) {
        return "in_inspection";
    }
    if (
        item.vehicleStatus === "returned" &&
        item.inspectionStatus === "completed"
    ) {
        return "repair_done";
    }
    if (item.vehicleStatus === "returned") {
        return "to_inspect";
    }
    if (item.vehicleStatus === "workshop") {
        return "in_workshop";
    }
    if (item.vehicleStatus === "available") {
        return "available";
    }
    return "other";
}

export function vehicleReturnStageDotClass(item: FleetReturnListItem): string {
    const semantic = vehicleReturnStageSemantic(item);
    return getDashboardSemanticDotClass(STAGE_PRESENTATION[semantic].dot);
}

export function vehicleReturnStageLabelTextClass(
    item: FleetReturnListItem,
): string {
    return stageLabelTextClass(vehicleReturnStageSemantic(item));
}

export function vehicleReturnDueReceivedLabel(
    item: FleetReturnListItem,
): string {
    if (item.receivedAt) {
        const date = item.receivedAt.slice(0, 10);
        return `Received ${formatVehicleReturnDueReceivedShort(date)}`;
    }
    if (item.expectedReturnDueDate) {
        return `Due ${formatVehicleReturnDueReceivedShort(item.expectedReturnDueDate)}`;
    }
    return "—";
}

export function vehicleReturnStageDotLevel(
    item: FleetReturnListItem,
): DashboardSemanticLevel {
    return STAGE_PRESENTATION[vehicleReturnStageSemantic(item)].dot;
}

/** DUE / RECEIVED column — red when due date is overdue (Figma). */
export function vehicleReturnDueReceivedUrgency(
    item: FleetReturnListItem,
): DashboardDueDateUrgency {
    if (isFleetReturnDueOverdue(item)) {
        return "overdue";
    }
    if (item.receivedAt || item.expectedReturnDueDate) {
        return item.receivedAt ? "received" : "on_time";
    }
    return "empty";
}

/** DUE / RECEIVED column — red when due date is overdue (Figma). */
export function vehicleReturnDueReceivedTextClass(
    item: FleetReturnListItem,
): string {
    return getDueDatePresentation(vehicleReturnDueReceivedUrgency(item))
        .textClass;
}

/** Vehicle Returns hub pipeline tab count colors (Figma Screen 1). */
export function vehicleReturnPipelineTabCountLevel(
    tab: FleetReturnListPipelineTab,
): DashboardSemanticLevel {
    switch (tab) {
        case "all_open":
            return "neutral";
        case "expected":
            return "info";
        case "overdue":
            return "danger";
        case "to_inspect":
            return "info";
        case "in_inspection":
            return "violet";
        case "workshop":
            return "amber";
        case "closed":
            return "success";
        default:
            return "muted";
    }
}
