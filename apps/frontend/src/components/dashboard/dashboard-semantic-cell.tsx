import type { ReactNode } from "react";
import { CheckCircle2, Circle } from "lucide-react";

import {
    DASHBOARD_STAGE_LABEL_BASE_CLASS,
    DASHBOARD_STATUS_PILL_BASE_CLASS,
    type DashboardDueDateUrgency,
    type DashboardSemanticLevel,
    getDashboardSemanticDotClass,
    getDashboardSemanticPillClass,
    getDashboardPipelineTabCountTextClass,
    getDashboardSemanticTextClass,
    getDueDatePresentation,
} from "@/lib/format/dashboard-table-semantic-presentation";
import {
    DASHBOARD_METRIC_TILE_LABEL_CLASS,
    DASHBOARD_METRIC_TILE_VALUE_CLASS,
    DASHBOARD_SECTION_HEADER_CLASS,
    type DashboardBannerLevel,
    type DashboardMetricTileVariant,
    type DashboardTimelineNodeState,
    getDashboardSemanticBannerContainerClass,
    getDashboardMetricTileContainerClass,
    getDashboardMetricTileValueEmphasisClass,
    getDashboardTimelineActiveDotClass,
    getDashboardTimelineActiveRingClass,
    getDashboardTimelineConnectorClass,
    getDashboardTimelineDoneIconClass,
    getDashboardTimelineLabelClass,
    getDashboardTimelinePendingIconClass,
} from "@/lib/format/dashboard-semantic-surfaces";

type DashboardStatusPillProps = {
    label: ReactNode;
    level: DashboardSemanticLevel;
    className?: string;
};

export function DashboardStatusPill({
    label,
    level,
    className = "",
}: DashboardStatusPillProps) {
    return (
        <span
            className={[
                DASHBOARD_STATUS_PILL_BASE_CLASS,
                getDashboardSemanticPillClass(level),
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {label}
        </span>
    );
}

type DashboardSemanticTextProps = {
    children: ReactNode;
    level?: DashboardSemanticLevel;
    urgency?: DashboardDueDateUrgency;
    className?: string;
};

/** Inline table text colored by semantic level or due-date urgency. */
export function DashboardSemanticText({
    children,
    level,
    urgency,
    className = "",
}: DashboardSemanticTextProps) {
    const toneClass = urgency
        ? getDueDatePresentation(urgency).textClass
        : level
          ? getDashboardSemanticTextClass(level)
          : "text-gray-900";

    return (
        <span className={["text-sm", toneClass, className].join(" ")}>
            {children}
        </span>
    );
}

type DashboardStageLabelProps = {
    label: ReactNode;
    dotLevel: DashboardSemanticLevel;
    /** Prefer {@link labelClass} when the label uses a module-specific subdued override. */
    labelLevel?: DashboardSemanticLevel;
    labelClass?: string;
    className?: string;
};

/** Pipeline stage column: colored dot + label (Vehicle Returns, similar lists). */
export function DashboardStageLabel({
    label,
    dotLevel,
    labelLevel,
    labelClass,
    className = "",
}: DashboardStageLabelProps) {
    const labelTone =
        labelClass ??
        (labelLevel ? getDashboardSemanticTextClass(labelLevel) : "text-gray-900");

    return (
        <span
            className={[
                DASHBOARD_STAGE_LABEL_BASE_CLASS,
                labelTone,
                className,
            ].join(" ")}
        >
            <span
                className={[
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    getDashboardSemanticDotClass(dotLevel),
                ].join(" ")}
                aria-hidden
            />
            {label}
        </span>
    );
}

type DashboardPipelineTabCountProps = {
    count: number;
    level: DashboardSemanticLevel;
    className?: string;
};

/** Pipeline hub tab numeric suffix — label uses separate slate styling. */
export function DashboardPipelineTabCount({
    count,
    level,
    className = "",
}: DashboardPipelineTabCountProps) {
    return (
        <span
            className={[
                "ml-1.5 tabular-nums",
                getDashboardPipelineTabCountTextClass(level, count),
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {count}
        </span>
    );
}

type DashboardSemanticBannerProps = {
    level: DashboardBannerLevel;
    children: ReactNode;
    className?: string;
    role?: "status" | "alert";
};

export function DashboardSemanticBanner({
    level,
    children,
    className = "",
    role = "status",
}: DashboardSemanticBannerProps) {
    return (
        <div
            role={role}
            className={[
                getDashboardSemanticBannerContainerClass(level),
                className,
            ].join(" ")}
        >
            {children}
        </div>
    );
}

type DashboardSectionHeaderProps = {
    children: ReactNode;
    className?: string;
};

export function DashboardSectionHeader({
    children,
    className = "",
}: DashboardSectionHeaderProps) {
    return (
        <h3 className={[DASHBOARD_SECTION_HEADER_CLASS, className].join(" ")}>
            {children}
        </h3>
    );
}

type DashboardMetricTileProps = {
    label: ReactNode;
    value: ReactNode;
    variant?: DashboardMetricTileVariant;
    valueLevel?: DashboardSemanticLevel;
    className?: string;
};

export function DashboardMetricTile({
    label,
    value,
    variant = "neutral",
    valueLevel,
    className = "",
}: DashboardMetricTileProps) {
    const valueClass = valueLevel
        ? getDashboardMetricTileValueEmphasisClass(valueLevel)
        : DASHBOARD_METRIC_TILE_VALUE_CLASS;

    return (
        <div
            className={[getDashboardMetricTileContainerClass(variant), className]
                .filter(Boolean)
                .join(" ")}
        >
            <p className={DASHBOARD_METRIC_TILE_LABEL_CLASS}>{label}</p>
            <p className={valueClass}>{value}</p>
        </div>
    );
}

type DashboardTimelineStepProps = {
    label: ReactNode;
    detail: ReactNode;
    state: DashboardTimelineNodeState;
    showConnector?: boolean;
};

export function DashboardTimelineStep({
    label,
    detail,
    state,
    showConnector = true,
}: DashboardTimelineStepProps) {
    return (
        <li className="flex gap-3">
            <div className="flex flex-col items-center">
                {state === "done" ? (
                    <CheckCircle2
                        className={getDashboardTimelineDoneIconClass()}
                        aria-hidden
                    />
                ) : state === "active" ? (
                    <span
                        className={getDashboardTimelineActiveRingClass()}
                        aria-hidden
                    >
                        <span className={getDashboardTimelineActiveDotClass()} />
                    </span>
                ) : (
                    <Circle
                        className={getDashboardTimelinePendingIconClass()}
                        aria-hidden
                    />
                )}
                {showConnector ? (
                    <span className={getDashboardTimelineConnectorClass()} />
                ) : null}
            </div>
            <div className="pb-6">
                <p
                    className={`text-sm font-medium ${getDashboardTimelineLabelClass(state)}`}
                >
                    {label}
                </p>
                <p className="mt-0.5 text-xs text-gray-600">{detail}</p>
            </div>
        </li>
    );
}
