"use client";

import { Toaster } from "sonner";

/** Single portal mount for all dashboard toasts (via `@/lib/toast/show-toast`). */
export function AppToaster() {
  return <Toaster />;
}
