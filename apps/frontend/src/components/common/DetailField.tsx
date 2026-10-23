"use client";

import { cn } from "@/lib/utils";
import { usePortalSearchHighlightTerm } from "@/components/layout/PortalSearchHighlightLayer";
import {
    renderTextWithPortalSearchHighlight,
    textMatchesPortalSearchHighlight,
} from "@/lib/navigation/portal-search-highlight-text";

type DetailFieldProps = {
    label: string;
    value: string;
};

/** Read-only label/value pair for org-style detail grids (locations, suppliers, lease terms, etc.). */
export default function DetailField({ label, value }: DetailFieldProps) {
    const highlightTerm = usePortalSearchHighlightTerm();
    const isMatch = textMatchesPortalSearchHighlight(value, highlightTerm);

    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </dt>
            <dd
                data-portal-search-match={isMatch ? "true" : undefined}
                className={cn(
                    "mt-1.5 text-sm font-medium text-gray-900",
                    isMatch &&
                        "rounded-md ring-2 ring-amber-400/80 ring-offset-2 transition-shadow",
                )}
            >
                {renderTextWithPortalSearchHighlight(value, highlightTerm)}
            </dd>
        </div>
    );
}
