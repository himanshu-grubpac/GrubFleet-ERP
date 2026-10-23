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

export async function copyDashboardRowText(
  text: string,
): Promise<boolean> {
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
    const success = await copyDashboardRowText(text);

    if (success) {
      showCopiedToClipboardToast();
      return;
    }

    showCopyToClipboardErrorToast();
  };

  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center">
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={dashboardRowCopyButtonClassName}
        title={ariaLabel}
        aria-label={ariaLabel}
      >
        <Copy className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      </button>
    </span>
  );
}
