"use client";

import { Copy } from "lucide-react";
import {
  showCopiedToClipboardToast,
  showCopyToClipboardErrorToast,
} from "@/lib/toast/show-toast";
import { dashboardRowCopyButtonClassName } from "./dashboard-row-icon-button";

type DashboardRowCopyButtonProps = {
  text: string;
  ariaLabel?: string;
};

export async function copyDashboardRowText(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    await navigator.clipboard.writeText(trimmed);
    return true;
  } catch {
    return false;
  }
}

export default function DashboardRowCopyButton({
  text,
  ariaLabel = "Copy row details",
}: DashboardRowCopyButtonProps) {
  if (!text.trim()) {
    return null;
  }

  const handleCopy = async () => {
    const copied = await copyDashboardRowText(text);
    if (copied) {
      showCopiedToClipboardToast();
      return;
    }
    showCopyToClipboardErrorToast();
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={dashboardRowCopyButtonClassName}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      <Copy className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
