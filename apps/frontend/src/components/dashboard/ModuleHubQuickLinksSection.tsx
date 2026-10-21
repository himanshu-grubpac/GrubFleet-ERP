"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getModuleHubQuickLinks } from "@/lib/navigation/module-hub-quick-links";
import { internalHref } from "@/lib/navigation/nav-path-match";

type ModuleHubQuickLinksSectionProps = {
  moduleRootHref: string;
  subtitle?: string;
};

export function ModuleHubQuickLinksSection({
  moduleRootHref,
  subtitle = "Select a section to continue.",
}: ModuleHubQuickLinksSectionProps) {
  const links = getModuleHubQuickLinks(moduleRootHref);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Quick Links</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              key={module.href}
              href={internalHref(module.href)}
              className="group rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-[#FE5720]/50 hover:bg-orange-50/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-orange-100 group-hover:text-[#FE5720]">
                  <Icon className="h-5 w-5" />
                </div>

                <ArrowRight className="h-4 w-4 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-[#FE5720]" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-gray-900 group-hover:text-[#FE5720]">
                {module.title}
              </h3>

              <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500">
                {module.description}
              </p>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <span className="text-xs font-medium text-[#FE5720]">
                  Open section
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
