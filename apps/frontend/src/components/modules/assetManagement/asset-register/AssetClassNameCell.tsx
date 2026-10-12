"use client";

import DashboardAssetClassNameCell from "@/components/dashboard/DashboardAssetClassNameCell";

type AssetClassNameCellProps = {
  name: string;
};

/** Asset class list — shared truncate (6) + copy icon (rule 37). */
export default function AssetClassNameCell({ name }: AssetClassNameCellProps) {
  return <DashboardAssetClassNameCell name={name} />;
}
