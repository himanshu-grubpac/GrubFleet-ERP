
"use client";

import { useCallback, useEffect, useState } from "react";

import LayoutHeader from "@/components/layout/LayoutHeader";
import ModuleSubHeader from "@/components/layout/ModuleSubHeader";
import { Sidebar } from "@/components/layout/sidebar";

import {
  readSidebarCollapsedPreference,
  writeSidebarCollapsedPreference,
} from "@/lib/layout/sidebar-preference";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsedPreference());
    setPreferenceReady(true);
  }, []);

  useEffect(() => {
    if (!preferenceReady) {
      return;
    }

    writeSidebarCollapsedPreference(sidebarCollapsed);
  }, [sidebarCollapsed, preferenceReady]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const previousOverflow =
      document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow =
        previousOverflow;
    };
  }, [mobileNavOpen]);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((value) => !value);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Main Header */}
        <LayoutHeader
          onMenuClick={() => setMobileNavOpen(true)}
        />

        {/* Breadcrumb Sub-header */}
        <ModuleSubHeader />

        {/* Page Content */}
        <main className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-y-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
