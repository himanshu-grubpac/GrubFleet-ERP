"use client";

import DashboardRowCopyButton from "@/components/dashboard/DashboardRowCopyButton";
import { formatAssetClassNameForDisplay } from "@/components/dashboard/dashboard-row-copy-text";

type DashboardAssetClassNameCellProps = {
  name: string;
  copyAriaLabel?: string;
};

export default function DashboardAssetClassNameCell({
  name,
  copyAriaLabel = "Copy class name",
}: DashboardAssetClassNameCellProps) {
  const trimmed = name.trim();
  if (!trimmed) {
    return <span className="text-gray-400">—</span>;
  }

  const display = formatAssetClassNameForDisplay(trimmed);

  return (
    <div className="flex min-w-0 max-w-[12rem] items-center gap-0.5">
      <span
        className="min-w-0 truncate text-sm font-medium text-gray-900"
        title={trimmed}
      >
        {display}
      </span>
      <DashboardRowCopyButton text={trimmed} ariaLabel={copyAriaLabel} />
    </div>
  );
}
