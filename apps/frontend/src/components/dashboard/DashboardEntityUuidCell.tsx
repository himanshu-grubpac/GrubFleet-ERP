"use client";

import DashboardRowCopyButton from "@/components/dashboard/DashboardRowCopyButton";
import { formatEntityUuidForDisplay } from "@/components/dashboard/dashboard-row-copy-text";

type DashboardEntityUuidCellProps = {
  id: string;
  copyAriaLabel?: string;
};

/** Stable entity UUID — compact display, full value on tooltip + copy (list tables). */
export default function DashboardEntityUuidCell({
  id,
  copyAriaLabel = "Copy ID",
}: DashboardEntityUuidCellProps) {
  const trimmed = id.trim();
  if (!trimmed) {
    return <span className="text-gray-400">—</span>;
  }

  const display = formatEntityUuidForDisplay(trimmed);

  return (
    <div className="flex min-w-0 max-w-[11rem] items-center gap-0.5">
      <span
        className="min-w-0 truncate font-mono text-xs text-gray-600"
        title={trimmed}
      >
        {display}
      </span>
      <DashboardRowCopyButton text={trimmed} ariaLabel={copyAriaLabel} />
    </div>
  );
}
