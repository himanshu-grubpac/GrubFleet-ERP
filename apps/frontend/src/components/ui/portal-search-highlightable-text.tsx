"use client";

import { cn } from "@/lib/utils";
import { usePortalSearchHighlightTerm } from "@/components/layout/PortalSearchHighlightLayer";
import {
  renderTextWithPortalSearchHighlight,
  textMatchesPortalSearchHighlight,
} from "@/lib/navigation/portal-search-highlight-text";

type PortalSearchHighlightableTextProps = {
  text: string;
  className?: string;
  as?: "span" | "p" | "h1";
};

/** Wrap headings or free text on detail pages for global-search highlight + scroll target. */
export default function PortalSearchHighlightableText({
  text,
  className,
  as: Tag = "span",
}: PortalSearchHighlightableTextProps) {
  const highlightTerm = usePortalSearchHighlightTerm();
  const isMatch = textMatchesPortalSearchHighlight(text, highlightTerm);

  return (
    <Tag
      data-portal-search-match={isMatch ? "true" : undefined}
      className={cn(
        className,
        isMatch &&
          "rounded-md ring-2 ring-amber-400/80 ring-offset-2 transition-shadow",
      )}
    >
      {renderTextWithPortalSearchHighlight(text, highlightTerm)}
    </Tag>
  );
}
