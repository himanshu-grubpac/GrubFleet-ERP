"use client";

import {
  AuthRedirectSkeleton,
  DashboardShellSkeleton,
} from "@/components/states/dashboard-shell-skeleton";
import { LoginCardSkeleton } from "@/components/states/skeleton";

export type AuthBootstrapLayout = "dashboard" | "minimal" | "login";

export type AuthBootstrapPhase = "boot" | "sign-in" | "sign-out";

export function AuthBootstrapLoader({
  layout = "dashboard",
  phase = "boot",
}: {
  layout?: AuthBootstrapLayout;
  phase?: AuthBootstrapPhase;
}) {
  if (layout === "login") {
    return <LoginCardSkeleton />;
  }

  if (phase === "sign-in" || phase === "sign-out") {
    if (layout === "dashboard") {
      return <DashboardShellSkeleton />;
    }
    return <LoginCardSkeleton />;
  }

  if (layout === "minimal") {
    return <AuthRedirectSkeleton />;
  }

  return <DashboardShellSkeleton />;
}
