"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  mainNavItems,
  filterNavByPermissions,
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
        className="flex-1 space-y-1 p-3"
        aria-label="Main"
      >
        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[#FE5720] text-white"
                  : "text-slate-700 hover:bg-orange-50 hover:text-[#FE5720]",
              )}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                aria-hidden
              />

              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}