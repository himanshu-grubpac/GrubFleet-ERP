// src/components/layout/LayoutHeader.tsx

"use client";

import { Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";
import Breadcrumb from "./Breadcrumb";

import {
  breadcrumbConfig,
  type BreadcrumbItem,
} from "@/config/breadcrumb-config";

interface LayoutHeaderProps {
  onMenuClick?: () => void;
}

export default function LayoutHeader({
  onMenuClick,
}: LayoutHeaderProps) {
  const pathname = usePathname();

  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      {/* ============================================================
          LEFT
      ============================================================ */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile menu */}
        <div className="md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Open navigation menu"
            onClick={onMenuClick}
            className="!border-slate-200 !text-slate-700"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />
      </div>

      {/* ============================================================
          RIGHT
      ============================================================ */}
      <div className="ml-4 flex shrink-0 items-center gap-3">
        {/* Search */}
        <div className="hidden sm:block">
          <input
            type="search"
            placeholder="Search across GrubERP..."
            className="h-8 w-48 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
          />
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell
            className="h-4 w-4"
            strokeWidth={1.7}
          />
        </button>

        {/* User */}
        <button
          type="button"
          aria-label="Account"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600"
        >
          K
        </button>
      </div>
    </header>
  );
}

/* ================================================================
   BREADCRUMB RESOLUTION
================================================================ */

/**
 * Builds breadcrumbs for the current pathname.
 *
 * Static route:
 * /organization/locations
 *
 * Result:
 * Organisation > Locations
 *
 * Dynamic route:
 * /organization/locations/123
 *
 * Result:
 * Organisation > Locations > 123
 *
 * Dynamic edit route:
 * /organization/locations/123/edit
 *
 * Result:
 * Organisation > Locations > 123 > Edit
 */
function getBreadcrumbs(
  pathname: string,
): BreadcrumbItem[] {
  /* ==============================================================
     1. EXACT ROUTE MATCH
     ============================================================== */

  if (breadcrumbConfig[pathname]) {
    return breadcrumbConfig[pathname];
  }

  /* ==============================================================
     2. FIND THE MOST SPECIFIC STATIC PARENT
     ============================================================== */

  const matchingRoute = Object.keys(breadcrumbConfig)
    .sort((a, b) => b.length - a.length)
    .find((route) =>
      pathname.startsWith(`${route}/`),
    );

  if (!matchingRoute) {
    return [];
  }

  const baseBreadcrumbs =
    breadcrumbConfig[matchingRoute];

  /* ==============================================================
     3. GET REMAINING URL SEGMENTS
     ============================================================== */

  const remainingPath = pathname.slice(
    matchingRoute.length,
  );

  const segments = remainingPath
    .split("/")
    .filter(Boolean);

  if (!segments.length) {
    return baseBreadcrumbs;
  }

  /* ==============================================================
     4. BUILD DYNAMIC BREADCRUMBS
     ============================================================== */

  const dynamicBreadcrumbs: BreadcrumbItem[] = [
    ...baseBreadcrumbs,
  ];

  let currentPath = matchingRoute;

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    const isLastSegment =
      index === segments.length - 1;

    const label = getDynamicSegmentLabel(
      segment,
      matchingRoute,
      segments,
      index,
    );

    const isActionSegment =
      isActionPageSegment(segment);

    dynamicBreadcrumbs.push({
      label,
      href:
        !isLastSegment && !isActionSegment
          ? currentPath
          : undefined,
    });
  });

  return dynamicBreadcrumbs;
}

/* ================================================================
   DYNAMIC SEGMENT LABEL
================================================================ */

/**
 * Converts URL segments into readable breadcrumb labels.
 *
 * Examples:
 *
 * VH-1006
 *     -> VH-1006
 *
 * vehicle-001
 *     -> Vehicle 001
 *
 * location-001
 *     -> Location 001
 *
 * edit
 *     -> Edit
 *
 * lease-history
 *     -> Lease History
 */
function getDynamicSegmentLabel(
  segment: string,
  matchingRoute: string,
  segments: string[],
  index: number,
): string {
  /* ==============================================================
     ACTION PAGES
     ============================================================== */

  if (segment === "edit") {
    return "Edit";
  }

  if (segment === "lease-history") {
    return "Lease History";
  }

  /* ==============================================================
     COMPLIANCE RENEWAL
     ============================================================== */

  if (
    matchingRoute ===
    "/asset-register/compliance-renewals" &&
    index === segments.length - 1
  ) {
    return "Renew";
  }

  /* ==============================================================
     NORMAL DYNAMIC ID
     ============================================================== */

  return formatDynamicId(segment);
}

/* ================================================================
   FORMAT DYNAMIC ID
================================================================ */

/**
 * Formats a dynamic URL ID for display.
 *
 * Examples:
 *
 * VH-1006
 *     -> VH-1006
 *
 * vehicle-001
 *     -> Vehicle 001
 *
 * location-001
 *     -> Location 001
 *
 * abc123
 *     -> Abc123
 */
function formatDynamicId(
  value: string,
): string {
  /*
   * Preserve codes such as:
   *
   * VH-1006
   * DL-01-AB-1234
   * KA-05-MN-1234
   */
  if (
    /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(
      value,
    )
  ) {
    return value;
  }

  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
}

/* ================================================================
   ACTION PAGE CHECK
================================================================ */

function isActionPageSegment(
  segment: string,
): boolean {
  return (
    segment === "edit" ||
    segment === "lease-history"
  );
}