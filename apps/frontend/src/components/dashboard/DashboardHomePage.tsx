"use client";

import { LayoutDashboard } from "lucide-react";
import { useMemo } from "react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ModuleHubQuickLinksSection } from "@/components/dashboard/ModuleHubQuickLinksSection";
import { getPortalMainModuleQuickLinks } from "@/lib/navigation/module-hub-quick-links";
import {
  filterNavByPermissions,
  mainNavItems,
} from "@/lib/navigation/modules";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardHomePage() {
  const { permissions, isLoading: isAuthLoading } = useAuth();

  const moduleLinks = useMemo(() => {
    const permissionSource = permissions.size > 0 ? permissions : null;
    const filtered = filterNavByPermissions(mainNavItems, permissionSource);
    return getPortalMainModuleQuickLinks(filtered);
  }, [permissions]);

  return (
    <DashboardLayout
      title="Dashboard"
      description="Access ERP modules and continue work from one place."
    >
      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FE5720]">
              <LayoutDashboard className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Portal Overview
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Select a module below to open its hub. Submodule links are
                available from each module home, matching the sidebar.
              </p>
            </div>
          </div>
        </section>

        {!isAuthLoading && moduleLinks.length === 0 ? (
          <p className="text-sm text-gray-500">
            No modules are available for your account. Contact an administrator
            if you need access.
          </p>
        ) : (
          <ModuleHubQuickLinksSection
            links={moduleLinks}
            sectionTitle="Modules"
            subtitle="Select a module to continue."
          />
        )}
      </div>
    </DashboardLayout>
  );
}
