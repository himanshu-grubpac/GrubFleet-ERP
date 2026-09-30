"use client";

import Link from "next/link";
import { Edit, Eye, Power, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared 32×32 row icon control — layout, focus ring shell, disabled */
export const dashboardRowIconButtonBaseClassName =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition focus:outline-none disabled:pointer-events-none disabled:opacity-40";

/** @deprecated Prefer action-specific class names below */
export const dashboardRowIconButtonClassName = cn(
  dashboardRowIconButtonBaseClassName,
  "text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-gray-400/40",
);

/** View (eye) — neutral, non-destructive */
export const dashboardRowViewButtonClassName = cn(
  dashboardRowIconButtonBaseClassName,
  "text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-gray-400/40",
);

/** Copy row details — neutral, distinct from activate/deactivate */
export const dashboardRowCopyButtonClassName = cn(
  dashboardRowIconButtonBaseClassName,
  "text-gray-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400/40",
);

/** Email/mobile copy in table cells — brand hover (not row-details copy) */
export const dashboardRowContactCopyButtonClassName = cn(
  dashboardRowIconButtonBaseClassName,
  "text-gray-500 transition-colors hover:bg-orange-50 hover:text-[#FE5720] focus-visible:ring-2 focus-visible:ring-[#FE5720]/35",
);

/** Edit — neutral, non-destructive */
export const dashboardRowEditButtonClassName = cn(
  dashboardRowIconButtonBaseClassName,
  "text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-gray-400/40",
);

/** Activate (inactive row → on) — aligns with active status chips (green-50 / green-700) */
export const dashboardRowActivateButtonClassName = cn(
  dashboardRowIconButtonBaseClassName,
  "text-green-600 hover:bg-green-50 hover:text-green-700 focus-visible:ring-2 focus-visible:ring-green-500/35",
);

/** Deactivate (active row → off) — warning / turn-off tone */
export const dashboardRowDeactivateButtonClassName = cn(
  dashboardRowIconButtonBaseClassName,
  "text-[#FE5720] hover:bg-orange-50 hover:text-[#E04E1C] focus-visible:ring-2 focus-visible:ring-[#FE5720]/35",
);

/** Kebab menu trigger — neutral gray */
export const dashboardRowMenuTriggerClassName =
  "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40 disabled:pointer-events-none disabled:opacity-40";

type DashboardRowViewLinkProps = {
  href: string;
  ariaLabel?: string;
  className?: string;
};

export function DashboardRowViewLink({
  href,
  ariaLabel = "View",
  className,
}: DashboardRowViewLinkProps) {
  return (
    <Link
      href={href}
      className={cn(dashboardRowViewButtonClassName, className)}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      <Eye className="h-4 w-4" strokeWidth={1.75} />
    </Link>
  );
}

type DashboardRowEditButtonProps = {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function DashboardRowEditButton({
  onClick,
  ariaLabel = "Edit",
  className,
  disabled = false,
}: DashboardRowEditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(dashboardRowEditButtonClassName, className)}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      <Edit className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

type DashboardRowStatusToggleButtonProps = {
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  activateLabel?: string;
  deactivateLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function DashboardRowStatusToggleButton({
  isActive,
  onActivate,
  onDeactivate,
  activateLabel = "Activate",
  deactivateLabel = "Deactivate",
  className,
  disabled = false,
}: DashboardRowStatusToggleButtonProps) {
  if (isActive) {
    return (
      <button
        type="button"
        onClick={onDeactivate}
        disabled={disabled}
        className={cn(dashboardRowDeactivateButtonClassName, className)}
        title={deactivateLabel}
        aria-label={deactivateLabel}
      >
        <PowerOff className="h-4 w-4" strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={disabled}
      className={cn(dashboardRowActivateButtonClassName, className)}
      title={activateLabel}
      aria-label={activateLabel}
    >
      <Power className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
