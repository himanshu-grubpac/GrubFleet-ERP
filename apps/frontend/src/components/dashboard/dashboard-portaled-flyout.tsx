"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const FLYOUT_GAP = 8;
const VIEWPORT_PADDING = 8;

export type DashboardFlyoutPlacement = "above" | "below";

export type FixedFlyoutPosition = {
  top: number;
  left: number;
  placement: DashboardFlyoutPlacement;
};

export function computeFixedFlyoutPosition(
  triggerRect: DOMRect,
  flyoutWidth: number,
  flyoutHeight: number,
  preferred: DashboardFlyoutPlacement = "above",
  align: "center" | "start" = "center",
): FixedFlyoutPosition {
  const maxLeft = Math.max(
    VIEWPORT_PADDING,
    window.innerWidth - flyoutWidth - VIEWPORT_PADDING,
  );

  let left =
    align === "start"
      ? triggerRect.left
      : triggerRect.left + triggerRect.width / 2 - flyoutWidth / 2;

  left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

  const belowTop = triggerRect.bottom + FLYOUT_GAP;
  const aboveTop = triggerRect.top - FLYOUT_GAP - flyoutHeight;

  const fitsBelow =
    belowTop + flyoutHeight + VIEWPORT_PADDING <= window.innerHeight;
  const fitsAbove = aboveTop >= VIEWPORT_PADDING;

  let placement = preferred;

  if (preferred === "below" && !fitsBelow && fitsAbove) {
    placement = "above";
  } else if (preferred === "above" && !fitsAbove && fitsBelow) {
    placement = "below";
  } else if (!fitsBelow && !fitsAbove) {
    placement =
      belowTop + flyoutHeight <= window.innerHeight - VIEWPORT_PADDING
        ? "below"
        : "above";
  }

  let top =
    placement === "below"
      ? belowTop
      : Math.max(VIEWPORT_PADDING, aboveTop);

  if (placement === "below") {
    top = Math.min(
      top,
      window.innerHeight - flyoutHeight - VIEWPORT_PADDING,
    );
  }

  return { top, left, placement };
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(value);
      } else {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}

type FlyoutTriggerProps = {
  ref?: Ref<HTMLElement>;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
};

type DashboardPortaledFlyoutProps = {
  content: ReactNode;
  children: ReactElement<FlyoutTriggerProps>;
  preferredPlacement?: DashboardFlyoutPlacement;
  align?: "center" | "start";
  interactive?: boolean;
  /** Keeps the flyout open regardless of hover (e.g. copy feedback). */
  forceOpen?: boolean;
  panelClassName?: string;
  role?: "tooltip" | "status";
};

export function DashboardPortaledFlyout({
  content,
  children,
  preferredPlacement = "above",
  align = "center",
  interactive = false,
  forceOpen = false,
  panelClassName,
  role = "tooltip",
}: DashboardPortaledFlyoutProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<FixedFlyoutPosition | null>(
    null,
  );

  const open = forceOpen || hoverOpen;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panel = panelRef.current;
    const width = panel?.offsetWidth ?? 0;
    const height = panel?.offsetHeight ?? 0;

    if (width === 0 || height === 0) return;

    setPosition(
      computeFixedFlyoutPosition(
        rect,
        width,
        height,
        preferredPlacement,
        align,
      ),
    );
  }, [align, preferredPlacement]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();

    const panel = panelRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (panel && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updatePosition);
      resizeObserver.observe(panel);
    }

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition, content]);

  const openFlyout = () => setHoverOpen(true);
  const closeFlyout = () => setHoverOpen(false);

  const trigger = isValidElement(children)
    ? cloneElement(children, {
        ref: mergeRefs(triggerRef, children.props.ref),
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
          openFlyout();
          children.props.onMouseEnter?.(event);
        },
        onMouseLeave: (event: MouseEvent<HTMLElement>) => {
          if (!interactive) closeFlyout();
          children.props.onMouseLeave?.(event);
        },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          openFlyout();
          children.props.onFocus?.(event);
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          if (!interactive) closeFlyout();
          children.props.onBlur?.(event);
        },
      })
    : children;

  const panel =
    open && typeof document !== "undefined" ? (
      <div
        ref={panelRef}
        role={role}
        className={cn(
          "fixed z-[100] pointer-events-none",
          interactive && "pointer-events-auto",
          !position && "invisible",
          panelClassName,
        )}
        style={
          position
            ? { top: position.top, left: position.left }
            : undefined
        }
        onMouseEnter={interactive ? openFlyout : undefined}
        onMouseLeave={interactive ? closeFlyout : undefined}
      >
        {content}
      </div>
    ) : null;

  return (
    <>
      {trigger}
      {panel ? createPortal(panel, document.body) : null}
    </>
  );
}
