import type { ReactNode } from 'react';

export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function LocationIdLayout({ children }: { children: ReactNode }) {
  return children;
}
