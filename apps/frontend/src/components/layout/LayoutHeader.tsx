
"use client";

import { Bell, LogOut, Menu } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import Breadcrumb from "./Breadcrumb";
import { resolveBreadcrumbs } from "@/lib/navigation/breadcrumb-resolver";
import { resolveFleetBreadcrumbs } from "@/lib/navigation/fleet-breadcrumb-resolver";
import { resolveOrganizationBreadcrumbs } from "@/lib/navigation/organization-breadcrumb-resolver";
import { resolveInventoryBreadcrumbs } from "@/lib/navigation/inventory-breadcrumb-resolver";
import { resolveFinanceBreadcrumbs } from "@/lib/navigation/finance-breadcrumb-resolver";
import {
  resolveAdministrationBreadcrumbs,
} from "@/lib/navigation/fleet-breadcrumb-resolver";

interface LayoutHeaderProps {
  onMenuClick?: () => void;
}

export default function LayoutHeader({
  onMenuClick,
}: LayoutHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoggingOut, logout } = useAuth();
  const breadcrumbs = pathname.startsWith("/fleet-leasing")
    ? resolveFleetBreadcrumbs(pathname, searchParams)
    : pathname.startsWith("/inventory")
      ? resolveInventoryBreadcrumbs(pathname, searchParams)
      : pathname.startsWith("/organization")
        ? resolveOrganizationBreadcrumbs(pathname, searchParams)
        : pathname.startsWith("/finance")
          ? resolveFinanceBreadcrumbs(pathname, searchParams)
          : pathname.startsWith("/administration")
            ? resolveAdministrationBreadcrumbs(pathname)
            : resolveBreadcrumbs(pathname, searchParams);

  return (
    <header className="flex min-w-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {isAuthenticated ? (
          <button
            type="button"
            disabled={isLoggingOut}
            aria-label={isLoggingOut ? "Signing out" : "Log out"}
            title={isLoggingOut ? "Signing out…" : "Log out"}
            onClick={() => {
              if (isLoggingOut) return;
              void logout?.();
            }}
            className={cn(
              "inline-flex h-9 min-w-[2.25rem] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 md:hidden",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FE5720]",
              isLoggingOut && "cursor-not-allowed opacity-60",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span className="sr-only">
              {isLoggingOut ? "Signing out…" : "Log out"}
            </span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
