"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPin,
  Truck,
  UserRound,
  Contact,
  Users,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const organizationNavItems = [
  {
    label: "Locations",
    href: "/organization/locations",
    icon: MapPin,
    description: "Depots, hubs, service yards & offices",
  },
  {
    label: "Suppliers",
    href: "/organization/suppliers",
    icon: Truck,
    description: "Vendors, parts providers & contractors",
  },
  {
    label: "Employees",
    href: "/organization/employees",
    icon: UserRound,
    description: "Staff directory & workforce allocation",
  },
  {
    label: "Driver Register",
    href: "/organization/driver-register",
    icon: Contact,
    description: "Commercial driver profiles, licenses & safety",
  },
  {
    label: "Clients",
    href: "/organization/clients",
    icon: Users,
    description: "Corporate fleet accounts & B2B leases",
  },
];

export function OrganizationSubNav() {
  const pathname = usePathname();

  const currentItem =
    organizationNavItems.find((item) => pathname.startsWith(item.href)) ||
    organizationNavItems[0];

  return (
    <div className="space-y-4">
      {/* Breadcrumb Bar */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/dashboard"
          className="transition hover:text-slate-800"
        >
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <Link
          href="/organization/locations"
          className="transition hover:text-slate-800"
        >
          Organization
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-semibold text-[#FE5720]">
          {currentItem.label}
        </span>
      </div>

      {/* Pill Navigation Bar */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50/80 p-1.5 backdrop-blur-xs">
        {organizationNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                isActive
                  ? "bg-white text-[#FE5720] shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive
                    ? "text-[#FE5720]"
                    : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#FE5720]" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
