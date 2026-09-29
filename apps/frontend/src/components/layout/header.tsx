"use client";

import { Menu, LogOut } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/lib/auth-context";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "fleet-leasing": "Fleet & Leasing",
  "lease-contracts": "Lease Contracts",
  new: "New Contract",
  edit: "Edit Contract",
  "asset-register": "Asset Register",
  inventory: "Inventory",
  finance: "Finance",
  workshop: "Workshop",
  procurement: "Procurement",
  administration: "Administration",
  users: "Users",
  roles: "Roles",
  organization: "Organization",
};

function formatSegment(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  // UUID or hex ID test (e.g. 8-4-4-4-12 or 20+ chars)
  if (
    /^[0-9a-fA-F-]{16,}$/.test(segment) ||
    /^[0-9a-fA-F]{8,}/.test(segment)
  ) {
    return "Contract Details";
  }
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Header() {
  const { isAuthenticated, isLoggingOut, logout } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      {/* Mobile Header */}
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="primary"
          size="sm"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="font-semibold text-slate-900">
          GrubPac ERP
        </span>
      </div>

      <div className="hidden flex-1 md:block" aria-hidden />

      {/* Mobile-only logout; desktop uses sidebar account menu */}
      <div className="ml-auto flex items-center gap-2 md:hidden">
        {isAuthenticated || isLoggingOut ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoggingOut}
            onClick={() => void logout?.()}
            className="!border-slate-200 !text-slate-700 hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            {isLoggingOut ? "Signing out…" : "Log out"}
          </Button>
        ) : null}
      </div>
    </header>
  );
}