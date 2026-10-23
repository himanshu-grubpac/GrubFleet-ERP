"use client";

import type { ReactNode } from "react";

export function escapeRegExpForHighlight(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive substring highlight for plain text (React-escaped, no HTML injection). */
export function renderTextWithPortalSearchHighlight(
  text: string,
  term: string | null,
): ReactNode {
  if (!term || !text) {
    return text;
  }

  const pattern = new RegExp(`(${escapeRegExpForHighlight(term)})`, "gi");
  const parts = text.split(pattern);
  if (parts.length <= 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (part.toLowerCase() === term.toLowerCase()) {
      return (
        <mark
          key={`${index}-${part}`}
          className="rounded-sm bg-yellow-200 px-0.5 text-inherit"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

export function textMatchesPortalSearchHighlight(
  text: string,
  term: string | null,
): boolean {
  if (!term || !text) {
    return false;
  }
  return text.toLowerCase().includes(term.toLowerCase());
}
