
"use client";

import { Bell, Menu } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import Button from "@/components/ui/GrubpacButton";
import Breadcrumb from "./Breadcrumb";
import { resolveBreadcrumbs } from "@/lib/navigation/breadcrumb-resolver";
import { resolveFleetBreadcrumbs } from "@/lib/navigation/fleet-breadcrumb-resolver";
import { resolveOrganizationBreadcrumbs } from "@/lib/navigation/organization-breadcrumb-resolver";
import { resolveInventoryBreadcrumbs } from "@/lib/navigation/inventory-breadcrumb-resolver";
import { resolveFinanceBreadcrumbs } from "@/lib/navigation/finance-breadcrumb-resolver";

interface LayoutHeaderProps {
  onMenuClick?: () => void;
}

export default function LayoutHeader({
  onMenuClick,
}: LayoutHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breadcrumbs = pathname.startsWith("/fleet-leasing")
    ? resolveFleetBreadcrumbs(pathname, searchParams)
    : pathname.startsWith("/inventory")
      ? resolveInventoryBreadcrumbs(pathname, searchParams)
      : pathname.startsWith("/organization")
        ? resolveOrganizationBreadcrumbs(pathname, searchParams)
        : pathname.startsWith("/finance")
          ? resolveFinanceBreadcrumbs(pathname, searchParams)
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
      </div>
    </header>
  );
}
