"use client";

import { SubPageBackLink } from "@/components/ui/SubPageBackLink";
import { DashboardBreadcrumbsFromPath } from "@/components/dashboard/DashboardBreadcrumbsFromPath";

type DashboardSubpageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  currentLabel?: string;
  className?: string;
};

export function DashboardSubpageHeader({
  backHref,
  backLabel,
  currentLabel,
  className,
}: DashboardSubpageHeaderProps) {
  const showBack = Boolean(backHref && backLabel);

  return (
    <div className={className ?? "border-b border-gray-200 bg-white"}>
      <div className="space-y-2 px-6 py-2.5">
        {showBack ? (
          <SubPageBackLink
            href={backHref!}
            label={backLabel!}
          />
        ) : null}
        <DashboardBreadcrumbsFromPath currentLabel={currentLabel} />
      </div>
    </div>
  );
}
