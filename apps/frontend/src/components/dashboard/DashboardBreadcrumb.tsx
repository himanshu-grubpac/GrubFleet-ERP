"use client";

import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

import type { DashboardBreadcrumbItem } from "@/lib/navigation/dashboard-breadcrumbs";
import { cn } from "@/lib/utils";

type DashboardBreadcrumbProps = {
  items: DashboardBreadcrumbItem[];
  className?: string;
  /** Highlight the last segment (organization list pages). */
  accentCurrent?: boolean;
};

export function DashboardBreadcrumb({
  items,
  className,
  accentCurrent = false,
}: DashboardBreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex flex-wrap items-center gap-1 text-xs text-gray-500",
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const showLink = Boolean(item.href) && !isLast;

        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <ChevronRight
                className="h-3 w-3 shrink-0 text-gray-400"
                aria-hidden
              />
            ) : null}
            {showLink ? (
              <Link href={item.href!} className="transition hover:text-gray-700">
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast &&
                    (accentCurrent
                      ? "font-semibold text-[#FE5720]"
                      : "font-medium text-gray-800"),
                )}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
