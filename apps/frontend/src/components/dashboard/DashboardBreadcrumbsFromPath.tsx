"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import {
  buildDashboardBreadcrumbs,
  type BuildDashboardBreadcrumbsOptions,
  type DashboardBreadcrumbItem,
} from "@/lib/navigation/dashboard-breadcrumbs";

/**
 * In-content breadcrumbs for wizard/detail flows (e.g. lease contract view/edit).
 * Standard dashboard **list** pages should use `LayoutHeader` breadcrumbs only plus
 * `DashboardLayout` for title/padding — do not render this on those lists (duplicates the shell).
 */
type DashboardBreadcrumbsFromPathProps = {
  pathname?: string;
  currentLabel?: string;
  items?: DashboardBreadcrumbItem[];
  className?: string;
  accentCurrent?: boolean;
};

export function DashboardBreadcrumbsFromPath({
  pathname: pathnameOverride,
  currentLabel,
  items,
  className,
  accentCurrent,
}: DashboardBreadcrumbsFromPathProps) {
  const pathname = usePathname();
  const resolvedPath = pathnameOverride ?? pathname ?? "/";

  const breadcrumbItems = useMemo(() => {
    const options: BuildDashboardBreadcrumbsOptions = {
      currentLabel,
      items,
    };
    return buildDashboardBreadcrumbs(resolvedPath, options);
  }, [resolvedPath, currentLabel, items]);

  return (
    <DashboardBreadcrumb
      items={breadcrumbItems}
      className={className}
      accentCurrent={accentCurrent}
    />
  );
}
