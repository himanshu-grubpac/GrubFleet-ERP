"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useCloseDropdownOnOutsideAndEscape,
  useFixedDropdownMenuPosition,
} from "@/components/dashboard/DashboardRowActionsMenu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Loader2,
  MoreVertical,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteRoleApi, updateRoleApi } from "@/lib/api/roles";

type PendingConfirm =
  | { kind: "toggle-active"; nextActive: boolean }
  | { kind: "delete" }
  | null;

type RoleRowActionsMenuProps = {
  roleId: string;
  roleName: string;
  isActive: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
};

export function RoleRowActionsMenu({
  roleId,
  roleName,
  isActive,
  canEdit,
  canDeactivate,
  canDelete,
}: RoleRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { token, organizationId, refetchMe } = useAuth();

  const { menuPosition } = useFixedDropdownMenuPosition({
    open,
    triggerRef,
    menuRef,
    menuMinWidth: 168,
    deps: [canEdit, canDeactivate, canDelete, isActive],
  });

  useCloseDropdownOnOutsideAndEscape({
    open,
    onClose: () => setOpen(false),
    triggerRef,
    menuRef,
  });

  const queryClient = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: async (nextActive: boolean) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateRoleApi(token, organizationId, roleId, {
        isActive: nextActive,
      });
    },
    onSuccess: async () => {
      setPendingConfirm(null);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["roles", organizationId] });
      await refetchMe?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return deleteRoleApi(token, organizationId, roleId);
    },
    onSuccess: async () => {
      setPendingConfirm(null);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["roles", organizationId] });
      await refetchMe?.();
    },
  });

  const base = `/administration/roles/edit/?roleId=${encodeURIComponent(roleId)}`;
  const viewHref = `${base}&mode=view`;
  const editHref = base;

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  const handleToggleActive = () => {
    setOpen(false);
    setPendingConfirm({ kind: "toggle-active", nextActive: !isActive });
  };

  const handleDelete = () => {
    setOpen(false);
    setPendingConfirm({ kind: "delete" });
  };

  const confirmDialogProps = (() => {
    if (!pendingConfirm) {
      return null;
    }
    if (pendingConfirm.kind === "delete") {
      return {
        title: `Delete role "${roleName}"?`,
        message:
          "Users assigned to this role will lose it. This action cannot be undone.",
        confirmLabel: "Delete role",
        variant: "destructive" as const,
        isConfirmPending: deleteMutation.isPending,
        onConfirm: () => deleteMutation.mutate(),
      };
    }
    const activating = pendingConfirm.nextActive;
    return {
      title: activating
        ? `Activate role "${roleName}"?`
        : `Deactivate role "${roleName}"?`,
      message: activating
        ? "Users with this role assignment will regain permissions from this role."
        : "Users keep the assignment but lose permissions from this role until it is activated again.",
      confirmLabel: activating ? "Activate role" : "Deactivate role",
      variant: "default" as const,
      isConfirmPending: toggleActiveMutation.isPending,
      onConfirm: () =>
        toggleActiveMutation.mutate(pendingConfirm.nextActive),
    };
  })();

  const menuPanel = open ? (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[168px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      style={
        menuPosition
          ? { top: menuPosition.top, left: menuPosition.left }
          : { top: -9999, left: -9999, visibility: "hidden" as const }
      }
    >
      <Link
        href={viewHref}
        onClick={() => setOpen(false)}
        className={itemClass}
        role="menuitem"
      >
        <Eye className="h-3.5 w-3.5 text-slate-500" />
        View permissions
      </Link>
      {canEdit ? (
        <Link
          href={editHref}
          onClick={() => setOpen(false)}
          className={itemClass}
          role="menuitem"
        >
          <Pencil className="h-3.5 w-3.5 text-slate-500" />
          Edit permissions
        </Link>
      ) : null}
      {canDeactivate ? (
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={toggleActiveMutation.isPending}
          className={`${itemClass} w-full text-left`}
          role="menuitem"
        >
          {toggleActiveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isActive ? (
            <PowerOff className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <Power className="h-3.5 w-3.5 text-slate-500" />
          )}
          {isActive ? "Deactivate role" : "Activate role"}
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className={`${itemClass} w-full text-left text-red-700 hover:bg-red-50`}
          role="menuitem"
        >
          {deleteMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Delete role
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="inline-flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Role actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {menuPanel && typeof document !== "undefined"
        ? createPortal(menuPanel, document.body)
        : null}
      <ConfirmDialog
        open={pendingConfirm !== null}
        title={confirmDialogProps?.title ?? ""}
        message={confirmDialogProps?.message ?? ""}
        confirmLabel={confirmDialogProps?.confirmLabel}
        variant={confirmDialogProps?.variant}
        isConfirmPending={confirmDialogProps?.isConfirmPending ?? false}
        onClose={() => {
          if (
            !deleteMutation.isPending &&
            !toggleActiveMutation.isPending
          ) {
            setPendingConfirm(null);
          }
        }}
        onConfirm={() => confirmDialogProps?.onConfirm()}
      />
    </div>
  );
}
