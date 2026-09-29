// src/components/layout/LayoutHeader.tsx

"use client";

import { Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";
import Breadcrumb from "./Breadcrumb";

import { breadcrumbConfig } from "@/config/breadcrumb-config";

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
      {/* Left */}
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

      {/* Right */}
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

/**
 * Finds the breadcrumb configuration for the current route.
 *
 * Exact route:
 * /organization/locations
 *
 * Dynamic route:
 * /organization/locations/123
 *
 * Both will use:
 * Organisation > Locations
 */
function getBreadcrumbs(pathname: string) {
  // Exact match
  if (breadcrumbConfig[pathname]) {
    return breadcrumbConfig[pathname];
  }

  // Find the most specific parent route
  const matchingRoute = Object.keys(breadcrumbConfig)
    .sort((a, b) => b.length - a.length)
    .find((route) =>
      pathname.startsWith(`${route}/`),
    );

  if (matchingRoute) {
    return breadcrumbConfig[matchingRoute];
  }

  return [];
}