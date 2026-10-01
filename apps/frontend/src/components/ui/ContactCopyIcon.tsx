"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { dashboardRowContactCopyButtonClassName } from "@/components/dashboard/dashboard-row-icon-button";
import {
  formatPhoneDisplay,
  formatPhoneForCopy,
  isPhoneValueEmpty,
} from "@/lib/format/phone-format";

type ContactCopyIconProps = {
  value: string;
  label: string;
  icon: LucideIcon;
  /** When set, clipboard uses international phone formatting. */
  copyKind?: "phone" | "plain";
};

export default function ContactCopyIcon({
  value,
  label,
  icon: Icon,
  copyKind = "plain",
}: ContactCopyIconProps) {
  const [copied, setCopied] = useState(false);

  if (copyKind === "phone" ? isPhoneValueEmpty(value) : !value?.trim()) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  const hoverText =
    copyKind === "phone" ? formatPhoneDisplay(value) : value.trim();

  const clipboardText =
    copyKind === "phone" ? formatPhoneForCopy(value) : value.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(clipboardText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={dashboardRowContactCopyButtonClassName}
        title={hoverText}
        aria-label={`Copy ${label}`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <div
        className="
          pointer-events-none
          absolute
          bottom-full
          left-1/2
          z-20
          mb-2
          hidden
          -translate-x-1/2
          whitespace-nowrap
          rounded-md
          bg-gray-900
          px-3
          py-2
          text-xs
          text-white
          shadow-lg
          group-hover:block
        "
      >
        {hoverText}
      </div>

      {copied ? (
        <span
          role="status"
          className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] font-medium text-white"
        >
          Copied
        </span>
      ) : null}
    </div>
  );
}
