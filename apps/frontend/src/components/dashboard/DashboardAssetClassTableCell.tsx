"use client";

import { Check, Copy } from "lucide-react";
import { DashboardPortaledFlyout } from "@/components/dashboard/dashboard-portaled-flyout";

type DashboardAssetClassTableCellProps = {
  assetClass: string;
  copied?: boolean;
  onCopy: () => void;
};

/** Truncated asset class label + portaled hover card (list tables). */
export default function DashboardAssetClassTableCell({
  assetClass,
  copied = false,
  onCopy,
}: DashboardAssetClassTableCellProps) {
  const trimmed = assetClass.trim();
  if (!trimmed) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <DashboardPortaledFlyout
      preferredPlacement="below"
      align="start"
      interactive
      panelClassName="
        w-max min-w-[260px] max-w-[360px]
        rounded-md border border-gray-200
        bg-white p-3 shadow-lg
      "
      content={
        <div className="flex items-start gap-1">
          <span className="min-w-0 flex-1 whitespace-normal break-words text-xs text-gray-800">
            {trimmed}
          </span>
          <button
            type="button"
            onClick={() => onCopy()}
            className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            title="Copy full asset class name"
            aria-label="Copy full asset class name"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      }
    >
      <span
        tabIndex={0}
        className="block w-[180px] max-w-full cursor-default truncate outline-none focus-visible:ring-1 focus-visible:ring-[#FE5720]/40"
      >
        {trimmed}
      </span>
    </DashboardPortaledFlyout>
  );
}
