"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "rounded-lg border border-gray-200 bg-white text-gray-900 shadow-lg",
          title: "text-sm font-medium",
          description: "text-sm text-gray-600",
        },
      }}
    />
  );
}
