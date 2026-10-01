import type { ReactNode } from 'react';

/** Static export (S3): one shell per dynamic segment; runtime UUIDs via client nav + CloudFront fallback. */
export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function ClientIdLayout({ children }: { children: ReactNode }) {
  return children;
}
