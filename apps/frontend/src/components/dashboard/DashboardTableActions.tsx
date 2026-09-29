"use client";

import DashboardViewCopyRowActions from "./DashboardViewCopyRowActions";

type DashboardTableActionsProps = {
  status: "active" | "inactive";
  locationId: string;
  copyText: string;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onActivate?: () => void;
};

export default function DashboardTableActions({
  status,
  locationId,
  copyText,
  onEdit,
  onDeactivate,
  onActivate,
}: DashboardTableActionsProps) {
  const isActive = status === "active";

  return (
    <DashboardViewCopyRowActions
      viewHref={`/organization/locations/${locationId}`}
      viewAriaLabel="View location"
      copyText={copyText}
      copyAriaLabel="Copy location row details"
      onEdit={isActive ? onEdit : undefined}
      menuAriaLabel="Location actions"
      status={status}
      onActivate={onActivate}
      onDeactivate={onDeactivate}
    />
  );
}
