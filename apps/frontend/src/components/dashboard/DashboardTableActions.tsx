"use client";

import DashboardViewCopyRowActions from "./DashboardViewCopyRowActions";

type DashboardTableActionsBaseProps = {
  status: "active" | "inactive";
  locationId?: string;
  onEdit?: () => void;
};

type DashboardTableLocationActionsProps = DashboardTableActionsBaseProps & {
  locationId: string;
  copyText: string;
  onDeactivate?: () => void;
  onActivate?: () => void;
  onToggleStatus?: never;
  viewHref?: never;
};

type DashboardTableModuleActionsProps = DashboardTableActionsBaseProps & {
  onEdit: () => void;
  onToggleStatus: () => void;
  viewHref?: string;
  copyText?: never;
  onDeactivate?: never;
  onActivate?: never;
};

type DashboardTableActionsProps =
  | DashboardTableLocationActionsProps
  | DashboardTableModuleActionsProps;

function isLocationActions(
  props: DashboardTableActionsProps,
): props is DashboardTableLocationActionsProps {
  return "copyText" in props && props.copyText !== undefined;
}

export default function DashboardTableActions(props: DashboardTableActionsProps) {
  const { status, locationId, onEdit } = props;
  const isActive = status === "active";

  if (isLocationActions(props)) {
    const { copyText, onDeactivate, onActivate } = props;

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

  const { viewHref, onToggleStatus } = props;
  const resolvedViewHref =
    viewHref ??
    (locationId ? `/organization/locations/${locationId}` : "#");
  const copyText = locationId ?? "";

  return (
    <DashboardViewCopyRowActions
      viewHref={resolvedViewHref}
      viewAriaLabel="View"
      copyText={copyText}
      copyAriaLabel="Copy ID"
      onEdit={isActive ? onEdit : undefined}
      menuAriaLabel="Row actions"
      status={status}
      onActivate={!isActive ? onToggleStatus : undefined}
      onDeactivate={isActive ? onToggleStatus : undefined}
    />
  );
}
