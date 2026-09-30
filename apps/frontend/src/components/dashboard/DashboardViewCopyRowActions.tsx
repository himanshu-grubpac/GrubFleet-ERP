"use client";

import type { ReactNode } from "react";
import DashboardRowCopyButton from "./DashboardRowCopyButton";
import {
  DashboardRowActionsMenu,
  DashboardRowActionsMenuItem,
} from "./DashboardRowActionsMenu";
import { DashboardRowViewLink } from "./dashboard-row-icon-button";

type DashboardViewCopyRowActionsProps = {
  viewHref: string;
  viewAriaLabel?: string;
  copyText: string;
  copyAriaLabel?: string;
  onEdit?: () => void;
  menuAriaLabel: string;
  status?: "active" | "inactive";
  onActivate?: () => void;
  onDeactivate?: () => void;
  children?: (ctx: { close: () => void }) => ReactNode;
};

export default function DashboardViewCopyRowActions({
  viewHref,
  viewAriaLabel = "View",
  copyText,
  copyAriaLabel,
  onEdit,
  menuAriaLabel,
  status,
  onActivate,
  onDeactivate,
  children,
}: DashboardViewCopyRowActionsProps) {
  const isActive = status === "active";
  const showActivate =
    status !== undefined && !isActive && onActivate !== undefined;
  const showDeactivate =
    status !== undefined && isActive && onDeactivate !== undefined;

  const hasOverflowMenu =
    onEdit !== undefined ||
    showActivate ||
    showDeactivate ||
    children !== undefined;

  return (
    <div className="flex items-center justify-end gap-1">
      <DashboardRowViewLink href={viewHref} ariaLabel={viewAriaLabel} />

      <DashboardRowCopyButton text={copyText} ariaLabel={copyAriaLabel} />

      {hasOverflowMenu ? (
        <DashboardRowActionsMenu ariaLabel={menuAriaLabel}>
          {({ close }) => (
            <>
              {onEdit ? (
                <DashboardRowActionsMenuItem
                  label="Edit"
                  onSelect={() => {
                    close();
                    onEdit();
                  }}
                />
              ) : null}
              {showDeactivate ? (
                <DashboardRowActionsMenuItem
                  label="Deactivate"
                  className="text-[#FE5720] hover:bg-orange-50"
                  onSelect={() => {
                    close();
                    onDeactivate!();
                  }}
                />
              ) : null}
              {showActivate ? (
                <DashboardRowActionsMenuItem
                  label="Activate"
                  className="text-green-700 hover:bg-green-50"
                  onSelect={() => {
                    close();
                    onActivate!();
                  }}
                />
              ) : null}
              {children ? children({ close }) : null}
            </>
          )}
        </DashboardRowActionsMenu>
      ) : null}
    </div>
  );
}
