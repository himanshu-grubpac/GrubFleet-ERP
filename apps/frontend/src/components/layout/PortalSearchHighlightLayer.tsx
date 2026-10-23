"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  normalizePortalSearchHighlightTerm,
  PORTAL_SEARCH_HIGHLIGHT_PARAM,
} from "@/lib/navigation/search-navigation";

const PortalSearchHighlightContext = createContext<string | null>(null);

export function usePortalSearchHighlightTerm(): string | null {
  return useContext(PortalSearchHighlightContext);
}

type PortalSearchHighlightLayerProps = {
  children: ReactNode;
};

/**
 * Reads ?highlight= from global search navigation; shows banner and scrolls to first match.
 */
export function PortalSearchHighlightLayer({
  children,
}: PortalSearchHighlightLayerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const highlightTerm = useMemo(
    () =>
      normalizePortalSearchHighlightTerm(
        searchParams.get(PORTAL_SEARCH_HIGHLIGHT_PARAM),
      ),
    [searchParams],
  );

  useEffect(() => {
    if (!highlightTerm) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const match = document.querySelector(
        '[data-portal-search-match="true"]',
      );
      match?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlightTerm, pathname]);

  return (
    <PortalSearchHighlightContext.Provider value={highlightTerm}>
      {highlightTerm ? (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6"
          role="status"
          aria-live="polite"
        >
          Showing matches for &ldquo;{highlightTerm}&rdquo; from search.
        </div>
      ) : null}
      {children}
    </PortalSearchHighlightContext.Provider>
  );
}
