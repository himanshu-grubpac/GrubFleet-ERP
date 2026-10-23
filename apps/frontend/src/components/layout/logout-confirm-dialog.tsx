"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type LogoutConfirmDialogProps = {
  open: boolean;
  isConfirmPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function LogoutConfirmDialog({
  open,
  isConfirmPending = false,
  onClose,
  onConfirm,
}: LogoutConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Log out?"
      message="You will be signed out of GrubFleet on this device."
      confirmLabel="Log out"
      isConfirmPending={isConfirmPending}
      confirmDisabled={isConfirmPending}
      onClose={() => {
        if (!isConfirmPending) {
          onClose();
        }
      }}
      onConfirm={onConfirm}
    />
  );
}
