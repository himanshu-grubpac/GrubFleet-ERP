import type {
    BulkAssignCatalogContract,
    BulkAssignCatalogLine,
} from "@/lib/api/asset-register/assignments";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";

export function contractStatusLabel(status: string): string {
    if (status === "active") return "Active";
    return status.replace(/_/g, " ");
}

export function contractDateRangeLabel(contract: BulkAssignCatalogContract): string {
    if (contract.startDate && contract.endDate) {
        return `${formatCalendarDateEnIn(contract.startDate)} – ${formatCalendarDateEnIn(contract.endDate)}`;
    }
    if (contract.startDate) {
        return `From ${formatCalendarDateEnIn(contract.startDate)}`;
    }
    return "—";
}

export function lineStatusPill(line: BulkAssignCatalogLine): {
    label: string;
    className: string;
} {
    if (line.lineStatus === "fully_assigned" || line.remainingToAssign <= 0) {
        return {
            label: "Fully assigned",
            className: "bg-slate-100 text-slate-500",
        };
    }
    if (line.lineStatus === "enough") {
        return {
            label: "Enough vehicles",
            className: "bg-green-50 text-green-700",
        };
    }
    return {
        label: `Short by ${line.shortBy}`,
        className: "bg-orange-50 text-orange-700",
    };
}

export function todayIsoDate(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
