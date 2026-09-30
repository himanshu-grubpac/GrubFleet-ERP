"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardRowMenuTriggerClassName } from "./dashboard-row-icon-button";

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
export const DASHBOARD_ROW_MENU_MIN_WIDTH = 160;

export type FixedMenuPosition = {
  top: number;
  left: number;
};

export function computeFixedMenuPosition(
  triggerRect: DOMRect,
  menuWidth: number,
  menuHeight: number,
): FixedMenuPosition {
  const left = Math.max(
    VIEWPORT_PADDING,
    triggerRect.right - menuWidth,
  );

  let top = triggerRect.bottom + MENU_GAP;

  if (menuHeight > 0) {
    const bottomEdge = top + menuHeight + VIEWPORT_PADDING;
    const overflowsBottom = bottomEdge > window.innerHeight;
    const topPlacement = triggerRect.top - MENU_GAP - menuHeight;

    if (overflowsBottom && topPlacement >= VIEWPORT_PADDING) {
      top = topPlacement;
    } else if (overflowsBottom) {
      top = Math.max(
        VIEWPORT_PADDING,
        window.innerHeight - menuHeight - VIEWPORT_PADDING,
      );
    }
  }

  return { top, left };
}

export function useFixedDropdownMenuPosition(options: {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLElement | null>;
  menuMinWidth?: number;
  deps?: unknown[];
}) {
  const {
    open,
    triggerRef,
    menuRef,
    menuMinWidth = DASHBOARD_ROW_MENU_MIN_WIDTH,
    deps = [],
  } = options;

  const [menuPosition, setMenuPosition] = useState<FixedMenuPosition | null>(
    null,
  );

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl?.offsetWidth ?? menuMinWidth;
    const menuHeight = menuEl?.offsetHeight ?? 0;
    setMenuPosition(computeFixedMenuPosition(rect, menuWidth, menuHeight));
  }, [menuMinWidth, menuRef, triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    const frame = requestAnimationFrame(() => updateMenuPosition());
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure when menu content changes
  }, [open, updateMenuPosition, ...deps]);

  useEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  return { menuPosition, updateMenuPosition };
}

export function useCloseDropdownOnOutsideAndEscape(options: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLElement | null>;
}) {
  const { open, onClose, triggerRef, menuRef } = options;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, menuRef, onClose, triggerRef]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
}

const menuItemClassName =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50";

type DashboardRowActionsMenuProps = {
  ariaLabel?: string;
  children: (helpers: { close: () => void }) => ReactNode;
};

export function DashboardRowActionsMenu({
  ariaLabel = "Row actions",
  children,
}: DashboardRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const { menuPosition } = useFixedDropdownMenuPosition({
    open,
    triggerRef,
    menuRef,
  });

  useCloseDropdownOnOutsideAndEscape({
    open,
    onClose: close,
    triggerRef,
    menuRef,
  });

  const menuPanel = open ? (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
      style={
        menuPosition
          ? { top: menuPosition.top, left: menuPosition.left }
          : { top: -9999, left: -9999, visibility: "hidden" }
      }
    >
      {children({ close })}
    </div>
  ) : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className={dashboardRowMenuTriggerClassName}
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {menuPanel && typeof document !== "undefined"
        ? createPortal(menuPanel, document.body)
        : null}
    </div>
  );
}

export function DashboardRowActionsMenuItem({
  icon,
  label,
  onSelect,
  className,
}: {
  icon?: ReactNode;
  label: string;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(menuItemClassName, className)}
    >
      {icon}
      {label}
    </button>
  );
}
