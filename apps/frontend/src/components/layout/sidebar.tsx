"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  mainNavItems,
  filterNavByPermissions,
  type NavItem,
} from "@/lib/navigation/modules";

import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { permissions, isAuthenticated } = useAuth();

  const items = filterNavByPermissions(
    mainNavItems,
    isAuthenticated && permissions.size > 0 ? permissions : null,
  );

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      {/* Branding */}
      <div className="border-b border-slate-200 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#FE5720]">
          GrubPac
        </p>

        <h1 className="text-lg font-bold text-slate-900">
          ERP Platform
        </h1>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-1 overflow-y-auto p-3"
        aria-label="Main"
      >
        {items.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            pathname={pathname}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const hasChildren =
    !!item.children && item.children.length > 0;

  const isActive =
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`);

  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [isActive]);

  const Icon = item.icon;

  // ============================================================
  // ITEM WITH SUB-NAVIGATION
  // ============================================================

  if (hasChildren) {
    return (
      <div>
        {/* Parent module */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-3",
            "text-sm font-medium transition-colors",
            isActive
              ? "bg-[#FE5720] text-white"
              : "text-slate-800 hover:bg-orange-50 hover:text-[#FE5720]",
          )}
        >
          <Icon
            className="h-5 w-5 shrink-0"
            aria-hidden
          />

          <span className="flex-1 text-left">
            {item.label}
          </span>

          {open ? (
            <ChevronDown
              className="h-4 w-4"
              aria-hidden
            />
          ) : (
            <ChevronRight
              className="h-4 w-4"
              aria-hidden
            />
          )}
        </button>

        {/* Sub-navigation */}
        {open && (
          <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
            {item.children!.map((child) => {
              const childActive =
                pathname === child.href ||
                pathname.startsWith(`${child.href}/`);

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm transition-colors",

                    // Active child
                    childActive
                      ? "bg-orange-100 font-semibold text-[#FE5720]"

                      // Normal + hover child
                      : "text-slate-600 hover:bg-orange-50 hover:text-[#FE5720]",
                  )}
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // NORMAL ITEM WITHOUT SUB-NAVIGATION
  // ============================================================

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-3",
        "text-sm font-medium transition-colors",
        isActive
          ? "bg-[#FE5720] text-white"
          : "text-slate-800 hover:bg-orange-50 hover:text-[#FE5720]",
      )}
    >
      <Icon
        className="h-5 w-5 shrink-0"
        aria-hidden
      />

      <span>{item.label}</span>
    </Link>
  );
}