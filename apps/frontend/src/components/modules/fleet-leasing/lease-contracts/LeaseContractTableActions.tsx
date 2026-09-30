"use client";

import DashboardRowCopyButton from "@/components/dashboard/DashboardRowCopyButton";
import { DashboardRowViewLink } from "@/components/dashboard/dashboard-row-icon-button";
import {
  DashboardRowActionsMenu,
  DashboardRowActionsMenuItem,
} from "@/components/dashboard/DashboardRowActionsMenu";

type LeaseContractTableActionsProps = {
  leaseId: string;
  copyText: string;
  showEdit?: boolean;
  showDeactivate?: boolean;
  showReactivate?: boolean;
  showActivateDraft?: boolean;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
  onActivateDraft?: () => void;
};

export default function LeaseContractTableActions({
  leaseId,
  copyText,
  showEdit,
  showDeactivate,
  showReactivate,
  showActivateDraft,
  onEdit,
  onDeactivate,
  onReactivate,
  onActivateDraft,
}: LeaseContractTableActionsProps) {
  const hasOverflowMenu =
    (showEdit && onEdit) ||
    (showDeactivate && onDeactivate) ||
    (showReactivate && onReactivate) ||
    (showActivateDraft && onActivateDraft);

  const viewHref = `/fleet-leasing/lease-contracts/detail/?leaseId=${encodeURIComponent(leaseId)}`;

  return (
    <div className="flex items-center justify-end gap-1">
      <DashboardRowViewLink
        href={viewHref}
        ariaLabel="View lease contract"
      />

      <DashboardRowCopyButton
        text={copyText}
        ariaLabel="Copy lease contract row details"
      />

      {hasOverflowMenu ? (
        <DashboardRowActionsMenu ariaLabel="Lease contract actions">
          {({ close }) => (
            <>
              {showEdit && onEdit ? (
                <DashboardRowActionsMenuItem
                  label="Edit"
                  onSelect={() => {
                    close();
                    onEdit();
                  }}
                />
              ) : null}
              {showActivateDraft && onActivateDraft ? (
                <DashboardRowActionsMenuItem
                  label="Activate"
                  className="text-green-700 hover:bg-green-50"
                  onSelect={() => {
                    close();
                    onActivateDraft();
                  }}
                />
              ) : null}
              {showDeactivate && onDeactivate ? (
                <DashboardRowActionsMenuItem
                  label="Deactivate"
                  className="text-[#FE5720] hover:bg-orange-50"
                  onSelect={() => {
                    close();
                    onDeactivate();
                  }}
                />
              ) : null}
              {showReactivate && onReactivate ? (
                <DashboardRowActionsMenuItem
                  label="Reactivate"
                  className="text-green-700 hover:bg-green-50"
                  onSelect={() => {
                    close();
                    onReactivate();
                  }}
                />
              ) : null}
            </>
          )}
        </DashboardRowActionsMenu>
      ) : null}
    </div>
  );
}
