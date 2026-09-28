"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Indeterminate brand bar — full viewport width or embedded (e.g. login card). */
export function AuthSessionTopBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-1 w-full overflow-hidden bg-slate-200/80", className)}
      aria-hidden
    >
      <div className="auth-session-progress-indeterminate h-full w-1/3 bg-[#FE5720]" />
    </div>
  );
}

export type AuthSessionProgressMessage =
  | "Signing in…"
  | "Signing out…"
  | "Loading session…";

/** Full-viewport auth transition — spinner + message, not dashboard skeleton. */
export function AuthSessionProgress({
  message,
}: {
  message: AuthSessionProgressMessage | string;
}) {
  return (
    <div
      className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-orange-50/30"
      aria-busy="true"
      aria-live="polite"
    >
      <AuthSessionTopBar className="fixed left-0 right-0 top-0 z-50" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <Loader2
          className="h-9 w-9 animate-spin text-[#FE5720]"
          aria-hidden
        />
        <p className="text-sm font-medium text-slate-700">{message}</p>
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
}
