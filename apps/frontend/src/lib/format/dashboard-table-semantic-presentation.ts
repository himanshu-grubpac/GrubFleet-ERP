/**
 * Shared Tailwind presentation for dashboard list/table semantic columns.
 *
 * Use for: status pills, pipeline stage dots/labels, due-date urgency, next-step hints.
 * Do not use for: form validation errors, mutation banners, or module-specific marketing chrome.
 * For banners, timelines, and metric tiles on detail pages see
 * {@link ./dashboard-semantic-surfaces.ts}.
 *
 * Levels (pick one semantic meaning per cell):
 * - `success` — active, valid, completed, on track
 * - `warning` — draft, expiring soon, needs attention soon
 * - `danger` — overdue, expired, terminated, failed
 * - `info` — in review, pending approval, informational pipeline step
 * - `brand` — product orange; awaiting action / return pending (portal `#FE5720` family)
 * - `amber` / `violet` — pipeline stage hues (workshop/repair, inspection)
 * - `purple` — billing paused and similar finance-adjacent states
 * - `neutral` — default readable label (gray-700/900 body text)
 * - `muted` — inactive, closed, empty placeholder, on hold
 *
 * Due-date urgency (`getDueDatePresentation`):
 * - `on_time` — due/received date with no urgency
 * - `due_soon` — approaching deadline (warning tone)
 * - `overdue` — past due (danger + medium weight)
 * - `received` — fulfilled date (same as on_time)
 * - `empty` — em dash / missing date (muted)
 */

export type DashboardSemanticLevel =
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "brand"
    | "amber"
    | "violet"
    | "purple"
    | "neutral"
    | "muted";

export type DashboardDueDateUrgency =
    | "on_time"
    | "due_soon"
    | "overdue"
    | "received"
    | "empty";

export type DashboardStatusTone = {
    textClass: string;
    dotClass: string;
    pillClass: string;
};

const SEMANTIC_TONE: Record<DashboardSemanticLevel, DashboardStatusTone> = {
    success: {
        textClass: "text-green-700",
        dotClass: "bg-green-500",
        pillClass: "bg-green-50 text-green-700",
    },
    warning: {
        textClass: "text-amber-800",
        dotClass: "bg-amber-500",
        pillClass: "bg-amber-50 text-amber-800",
    },
    danger: {
        textClass: "text-red-600",
        dotClass: "bg-red-500",
        pillClass: "bg-red-50 text-red-700",
    },
    info: {
        textClass: "text-blue-700",
        dotClass: "bg-blue-500",
        pillClass: "bg-blue-50 text-blue-800",
    },
    brand: {
        textClass: "text-orange-800",
        dotClass: "bg-orange-500",
        pillClass: "bg-orange-50 text-orange-800",
    },
    amber: {
        textClass: "text-amber-800",
        dotClass: "bg-amber-600",
        pillClass: "bg-amber-50 text-amber-800",
    },
    violet: {
        textClass: "text-violet-700",
        dotClass: "bg-violet-500",
        pillClass: "bg-violet-50 text-violet-800",
    },
    purple: {
        textClass: "text-purple-800",
        dotClass: "bg-purple-500",
        pillClass: "bg-purple-50 text-purple-800",
    },
    neutral: {
        textClass: "text-gray-900",
        dotClass: "bg-gray-400",
        pillClass: "bg-gray-100 text-gray-700",
    },
    muted: {
        textClass: "text-gray-500",
        dotClass: "bg-gray-400",
        pillClass: "bg-gray-100 text-gray-500",
    },
};

/** Shared pill shell — pair with {@link getDashboardSemanticPillClass}. */
export const DASHBOARD_STATUS_PILL_BASE_CLASS =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium";

/** Stage column label row (dot + text). */
export const DASHBOARD_STAGE_LABEL_BASE_CLASS =
    "inline-flex items-center gap-1.5 text-xs font-medium";

/** Subdued row text (on hold, secondary stage labels) — between muted and neutral. */
export const DASHBOARD_TEXT_SUBDUED_CLASS = "text-gray-600";

const DUE_DATE_TEXT_CLASS: Record<DashboardDueDateUrgency, string> = {
    on_time: "text-gray-900",
    due_soon: "text-amber-700 font-medium",
    overdue: "text-red-600 font-medium",
    received: "text-gray-900",
    empty: "text-gray-400",
};

export function getDashboardStatusTone(
    level: DashboardSemanticLevel,
): DashboardStatusTone {
    return SEMANTIC_TONE[level];
}

export function getDashboardSemanticTextClass(
    level: DashboardSemanticLevel,
): string {
    return SEMANTIC_TONE[level].textClass;
}

export function getDashboardSemanticDotClass(
    level: DashboardSemanticLevel,
): string {
    return SEMANTIC_TONE[level].dotClass;
}

export function getDashboardSemanticPillClass(
    level: DashboardSemanticLevel,
): string {
    return SEMANTIC_TONE[level].pillClass;
}

export function getDueDatePresentation(urgency: DashboardDueDateUrgency): {
    textClass: string;
} {
    return { textClass: DUE_DATE_TEXT_CLASS[urgency] };
}

/** Organisation-style Active / Inactive list status column. */
export function getDashboardEntityLifecyclePillClass(isActive: boolean): string {
    return getDashboardSemanticPillClass(isActive ? "success" : "muted");
}

/** Driver register list status variants. */
export function getDashboardDriverRegisterStatusPillClass(
    status: "active" | "inactive" | "license-expired",
): string {
    switch (status) {
        case "active":
            return getDashboardSemanticPillClass("success");
        case "license-expired":
            return getDashboardSemanticPillClass("danger");
        default:
            return getDashboardSemanticPillClass("muted");
    }
}

/** Compliance / renewal-style validity column. */
export function getDashboardComplianceValidityPillClass(
    status: "Valid" | "Expiring Soon" | "Expired" | string,
): string {
    switch (status) {
        case "Valid":
            return getDashboardSemanticPillClass("success");
        case "Expiring Soon":
            return getDashboardSemanticPillClass("warning");
        case "Expired":
            return getDashboardSemanticPillClass("danger");
        default:
            return getDashboardSemanticPillClass("muted");
    }
}

/**
 * Pipeline / hub tab badge count — semantic hue when count > 0, subdued when zero.
 * Tab labels stay slate; apply this class only to the numeric suffix.
 */
export function getDashboardPipelineTabCountTextClass(
    level: DashboardSemanticLevel,
    count: number,
): string {
    if (count <= 0) {
        return getDashboardSemanticTextClass("muted");
    }
    const base = getDashboardSemanticTextClass(level);
    if (level === "danger") {
        return `${base} font-semibold`;
    }
    if (level === "warning" || level === "amber") {
        return `${base} font-medium`;
    }
    return base;
}
