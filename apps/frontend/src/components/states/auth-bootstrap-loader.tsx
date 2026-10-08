"use client";

import { AuthSessionProgress } from "@/components/states/auth-session-progress";
import {
  AuthRedirectSkeleton,
  DashboardShellSkeleton,
} from "@/components/states/dashboard-shell-skeleton";

export type AuthBootstrapLayout = "dashboard" | "minimal";

export type AuthBootstrapPhase = "boot" | "sign-in" | "sign-out";

export function AuthBootstrapLoader({
  layout = "dashboard",
  phase = "boot",
}: {
  layout?: AuthBootstrapLayout;
  phase?: AuthBootstrapPhase;
}) {
  if (phase === "sign-in") {
    return <AuthSessionProgress message="Signing in…" />;
  }

  if (phase === "sign-out") {
    return <AuthSessionProgress message="Signing out…" />;
  }

  if (layout === "minimal") {
    return <AuthRedirectSkeleton />;
  }

  return <DashboardShellSkeleton />;
}
