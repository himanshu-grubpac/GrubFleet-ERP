"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import {
  showCopiedToClipboardToast,
  showCopyToClipboardErrorToast,
} from "@/lib/toast/show-toast";
import { dashboardRowCopyButtonClassName } from "./dashboard-row-icon-button";
import { DashboardPortaledFlyout } from "./dashboard-portaled-flyout";

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  if (!text.trim()) {
    return null;
  }

  const handleCopy = async () => {
    const success = await copyDashboardRowText(text);

    if (success) {
      setCopied(true);
      showCopiedToClipboardToast();
      return;
    }

    setCopied(false);
    showCopyToClipboardErrorToast();
  };

  return (
    <DashboardPortaledFlyout
      forceOpen={copied}
      role="status"
      panelClassName="
        relative whitespace-nowrap rounded-md border border-orange-100
        bg-white px-3 py-1.5 text-xs font-semibold text-[#FE5720] shadow-md
      "
      content={
        <>
          Copied!
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-white" />
        </>
      }
    >
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={dashboardRowCopyButtonClassName}
        title={ariaLabel}
        aria-label={ariaLabel}
      >
        <Copy className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </DashboardPortaledFlyout>
  );
}