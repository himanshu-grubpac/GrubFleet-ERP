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
/** Fallback size before first layout measure (copy / short tooltips). */
const FLYOUT_FALLBACK_WIDTH = 88;
const FLYOUT_FALLBACK_HEIGHT = 36;

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
  /** When false, flyout opens only via {@link forceOpen} (avoids hover scroll churn in tables). */
  openOnHover?: boolean;
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
  openOnHover = true,
  forceOpen = false,
  panelClassName,
  role = "tooltip",
}: DashboardPortaledFlyoutProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const positionCacheRef = useRef<FixedFlyoutPosition | null>(null);
  const positionFrameRef = useRef<number | null>(null);
  const positionMeasureRetriesRef = useRef(0);
  const MAX_POSITION_MEASURE_RETRIES = 12;
  const [position, setPosition] = useState<FixedFlyoutPosition | null>(
    null,
  );

  const open = forceOpen || (openOnHover && hoverOpen);
  const trackViewportMotion = openOnHover || interactive;

  const schedulePositionUpdateRef = useRef<() => void>(() => {});

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panel = panelRef.current;
    const measuredWidth = panel?.offsetWidth ?? 0;
    const measuredHeight = panel?.offsetHeight ?? 0;

    if (measuredWidth === 0 || measuredHeight === 0) {
      if (positionMeasureRetriesRef.current < MAX_POSITION_MEASURE_RETRIES) {
        positionMeasureRetriesRef.current += 1;
        schedulePositionUpdateRef.current();
      }
    } else {
      positionMeasureRetriesRef.current = 0;
    }

    const width = measuredWidth || FLYOUT_FALLBACK_WIDTH;
    const height = measuredHeight || FLYOUT_FALLBACK_HEIGHT;

    const next = computeFixedFlyoutPosition(
      rect,
      width,
      height,
      preferredPlacement,
      align,
    );

    const prev = positionCacheRef.current;
    if (
      prev &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.placement === next.placement
    ) {
      return;
    }

    positionCacheRef.current = next;
    setPosition(next);
  }, [align, preferredPlacement]);

  const schedulePositionUpdate = useCallback(() => {
    if (positionFrameRef.current != null) {
      return;
    }

    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  schedulePositionUpdateRef.current = schedulePositionUpdate;

  useLayoutEffect(() => {
    if (!open) {
      positionCacheRef.current = null;
      positionMeasureRetriesRef.current = 0;
      setPosition(null);
      return;
    }

    updatePosition();

    const panel = panelRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (panel && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(schedulePositionUpdate);
      resizeObserver.observe(panel);
    }

    if (trackViewportMotion) {
      window.addEventListener("scroll", schedulePositionUpdate, true);
      window.addEventListener("resize", schedulePositionUpdate);
    }

    return () => {
      if (positionFrameRef.current != null) {
        window.cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
      resizeObserver?.disconnect();
      if (trackViewportMotion) {
        window.removeEventListener("scroll", schedulePositionUpdate, true);
        window.removeEventListener("resize", schedulePositionUpdate);
      }
    };
  }, [
    open,
    updatePosition,
    schedulePositionUpdate,
    content,
    trackViewportMotion,
  ]);

  const openFlyout = () => {
    if (!openOnHover) return;
    setHoverOpen(true);
  };
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
          if (openOnHover) openFlyout();
          children.props.onFocus?.(event);
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          if (openOnHover && !interactive) closeFlyout();
          children.props.onBlur?.(event);
        },
      })
    : children;

  /**
   * Fixed panels portaled to `document.body` MUST always have explicit
   * top/left. Without insets, browsers use the static position at the end of
   * the document, which expands page scroll width/height (table “shift”).
   */
  const resolvedPosition: FixedFlyoutPosition | null = (() => {
    if (position) return position;
    const trigger = triggerRef.current;
    if (!trigger) return null;
    return computeFixedFlyoutPosition(
      trigger.getBoundingClientRect(),
      FLYOUT_FALLBACK_WIDTH,
      FLYOUT_FALLBACK_HEIGHT,
      preferredPlacement,
      align,
    );
  })();

  const panel =
    open && typeof document !== "undefined" ? (
      <div
        ref={panelRef}
        role={role}
        className={cn(
          "fixed z-[100] pointer-events-none transition-none",
          interactive && "pointer-events-auto",
          !resolvedPosition && "invisible",
          panelClassName,
        )}
        style={
          resolvedPosition
            ? { top: resolvedPosition.top, left: resolvedPosition.left }
            : { top: -9999, left: -9999 }
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
