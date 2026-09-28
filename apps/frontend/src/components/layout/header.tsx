"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, User, ChevronRight, Home } from "lucide-react";
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
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  // Generate dynamic breadcrumbs from current URL path
  const segments = pathname ? pathname.split("/").filter(Boolean) : [];
  const breadcrumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const label = formatSegment(seg);
    const isLast = idx === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      {/* Mobile Header / Brand */}
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

      {/* Desktop Navigation Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="hidden items-center gap-1.5 text-xs text-slate-500 md:flex"
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-slate-400 transition-colors hover:text-[#FE5720]"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>

        {breadcrumbs.length > 0 && (
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        )}

        {breadcrumbs.map((crumb) => (
          <div key={crumb.href} className="flex items-center gap-1.5">
            {crumb.isLast ? (
              <span className="font-semibold text-slate-900">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="transition-colors hover:text-[#FE5720]"
              >
                {crumb.label}
              </Link>
            )}
            {!crumb.isLast && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            )}
          </div>
        ))}
      </nav>

      {/* Right side: Email & Signout in the main header */}
      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 py-1 pl-1.5 pr-3 text-xs text-slate-700">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[#FE5720]">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-slate-800">
              {user?.email || "Admin"}
            </span>
          </div>
        )}

        {isAuthenticated ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={logout}
            className="!border-slate-200 !text-slate-700 hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        ) : (
          <Link href="/login">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="!bg-[#FE5720] !text-white hover:!bg-[#E64A19]"
            >
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}