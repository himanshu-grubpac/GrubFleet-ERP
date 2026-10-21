"use client";

type DashboardAssetClassIdCellProps = {
  /** Org-unique 6-digit class identifier (API `classId`). Not UUID `id` or `name`. */
  classId: string;
};

/** Class ID column — full 6-digit id only; no UUID, no copy, no hover expansion. */
export default function DashboardAssetClassIdCell({
  classId,
}: DashboardAssetClassIdCellProps) {
  const trimmed = classId.trim();
  if (!trimmed) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <span className="block min-w-0 font-mono text-xs tabular-nums text-gray-700">
      {trimmed}
    </span>
  );
}
