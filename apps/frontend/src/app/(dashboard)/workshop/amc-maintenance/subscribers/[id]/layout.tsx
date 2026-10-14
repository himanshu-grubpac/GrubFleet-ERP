import type { ReactNode } from "react";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function WorkshopAmcSubscriberLegacyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
