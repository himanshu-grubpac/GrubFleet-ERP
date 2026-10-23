/**
 * Dashboard semantic **surfaces** — banners, timelines, metric tiles, section chrome.
 *
 * Pair with {@link dashboard-table-semantic-presentation} for table pills/dots/text.
 *
 * When to use:
 * - **Banner** — inline callout on detail/sub-flow pages (inspection result, gate warnings).
 *   Not Sonner toasts (`40`) and not list status pills.
 * - **Timeline node** — vertical lifecycle steps (return timeline, lease milestones).
 * - **Metric tile** — labeled KPI card on outcome/summary screens.
 * - **Section header** — uppercase/small-caps block titles above cards (Return timeline, Job card).
 * - **Disabled reason** — helper text under disabled actions (`title` + visible hint).
 * - **Job card header** — emphasis strip for workshop job reference rows.
 *
 * Levels map to portal Tailwind tokens only (rule 43) — no raw hex in consumers.
 */

import {
    getDashboardSemanticDotClass,
    getDashboardSemanticPillClass,
    getDashboardSemanticTextClass,
    type DashboardSemanticLevel,
} from "./dashboard-table-semantic-presentation";

/** Detail / workflow banner tone — includes warning for gate and odometer alerts. */
export type DashboardBannerLevel = "success" | "info" | "warning" | "danger";

/** Vertical timeline step state. */
export type DashboardTimelineNodeState = "done" | "active" | "pending";

/** Metric card emphasis (overdue KPI uses danger border). */
export type DashboardMetricTileVariant = "neutral" | "danger";

const BANNER_SURFACE: Record<
    DashboardBannerLevel,
    { containerClass: string; iconClass: string }
> = {
    success: {
        containerClass: "border-green-200 bg-green-50 text-green-900",
        iconClass: "text-green-600",
    },
    info: {
        containerClass: "border-blue-200 bg-blue-50 text-blue-900",
        iconClass: "text-blue-600",
    },
    warning: {
        containerClass: "border-amber-200 bg-amber-50 text-amber-900",
        iconClass: "text-amber-600",
    },
    danger: {
        containerClass: "border-red-200 bg-red-50 text-red-900",
        iconClass: "text-red-600",
    },
};

const TIMELINE_LABEL_CLASS: Record<DashboardTimelineNodeState, string> = {
    done: "text-gray-900",
    active: "text-gray-900",
    pending: "text-gray-500",
};

/** Shared shell for inline semantic banners. */
export const DASHBOARD_SEMANTIC_BANNER_BASE_CLASS =
    "rounded-lg border px-4 py-3 text-sm";

/** Uppercase section title above detail cards (Return timeline, Recovery note). */
export const DASHBOARD_SECTION_HEADER_CLASS =
    "text-xs font-semibold uppercase tracking-wider text-slate-500";

/** Muted helper when a primary/secondary action is disabled. */
export const DASHBOARD_DISABLED_REASON_CLASS = "text-xs text-gray-500";

/** Metric tile label row. */
export const DASHBOARD_METRIC_TILE_LABEL_CLASS =
    "text-xs font-medium uppercase tracking-wide text-gray-500";

/** Metric tile value row. */
export const DASHBOARD_METRIC_TILE_VALUE_CLASS =
    "mt-1 text-lg font-semibold text-gray-900";

export function getDashboardSemanticBannerClasses(level: DashboardBannerLevel): {
    containerClass: string;
    iconClass: string;
} {
    return BANNER_SURFACE[level];
}

export function getDashboardSemanticBannerContainerClass(
    level: DashboardBannerLevel,
): string {
    const { containerClass } = BANNER_SURFACE[level];
    return [DASHBOARD_SEMANTIC_BANNER_BASE_CLASS, containerClass].join(" ");
}

/** Maps API statusBanner.level (success | info) to banner surface. */
export function getDashboardBannerLevelFromStatusBanner(
    level: "success" | "info" | "warning" | "danger" | null | undefined,
): DashboardBannerLevel {
    if (level === "warning") return "warning";
    if (level === "danger") return "danger";
    if (level === "info") return "info";
    return "success";
}

export function getDashboardTimelineLabelClass(
    state: DashboardTimelineNodeState,
): string {
    return TIMELINE_LABEL_CLASS[state];
}

/** Active step uses brand ring; done uses success icon class from surfaces. */
export function getDashboardTimelineActiveRingClass(): string {
    return "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#FE5720] bg-orange-50";
}

export function getDashboardTimelineActiveDotClass(): string {
    return "h-2 w-2 rounded-full bg-[#FE5720]";
}

export function getDashboardTimelinePendingIconClass(): string {
    return "h-5 w-5 shrink-0 text-gray-300";
}

export function getDashboardTimelineDoneIconClass(): string {
    return "h-5 w-5 shrink-0 text-green-600";
}

export function getDashboardTimelineConnectorClass(): string {
    return "mt-1 w-px flex-1 bg-gray-200";
}

export function getDashboardMetricTileContainerClass(
    variant: DashboardMetricTileVariant = "neutral",
): string {
    const border =
        variant === "danger" ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-gray-50";
    return `rounded-lg border p-4 ${border}`;
}

export function getDashboardMetricTileValueEmphasisClass(
    level: DashboardSemanticLevel = "neutral",
): string {
    return ["text-lg font-semibold", getDashboardSemanticTextClass(level)].join(
        " ",
    );
}

/** Workshop job card title row — neutral title + optional status pill level. */
export function getDashboardJobCardStatusPillClass(
    status: "open" | "closed" | string,
): string {
    const level: DashboardSemanticLevel =
        status === "open" ? "info" : status === "closed" ? "success" : "muted";
    return getDashboardSemanticPillClass(level);
}

/** Severity emphasis for inspection/re-inspection item history (Was • Major). */
export function getDashboardInspectionSeverityLevel(
    rating: "pass" | "minor" | "major" | string,
): DashboardSemanticLevel {
    if (rating === "major") return "danger";
    if (rating === "minor") return "warning";
    if (rating === "pass") return "success";
    return "muted";
}

export function getDashboardInspectionSeverityDotClass(
    rating: "pass" | "minor" | "major" | string,
): string {
    return getDashboardSemanticDotClass(
        getDashboardInspectionSeverityLevel(rating),
    );
}

const INSPECTION_RATING_TOGGLE_BASE =
    "rounded px-2 py-0.5 text-xs font-medium capitalize";

/** Pass / Minor / Major segmented control on inspection and re-inspection rows. */
export function getDashboardInspectionRatingToggleClass(
    rating: "pass" | "minor" | "major",
    selected: boolean,
): string {
    if (!selected) {
        return `${INSPECTION_RATING_TOGGLE_BASE} bg-gray-100 text-gray-600 hover:bg-gray-200`;
    }
    if (rating === "pass") {
        return `${INSPECTION_RATING_TOGGLE_BASE} bg-green-100 text-green-800`;
    }
    if (rating === "minor") {
        return `${INSPECTION_RATING_TOGGLE_BASE} bg-amber-100 text-amber-900`;
    }
    return `${INSPECTION_RATING_TOGGLE_BASE} bg-red-100 text-red-800`;
}
