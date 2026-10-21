import type { ReactNode } from 'react';

/**
 * Pass-through App Router segment layout — keeps a stable layout boundary for
 * static export / client navigation without remounting `(dashboard)` chrome.
 * Copy: add `layout.tsx` at module root with `export default PassThroughLayout`.
 */
export default function PassThroughLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
