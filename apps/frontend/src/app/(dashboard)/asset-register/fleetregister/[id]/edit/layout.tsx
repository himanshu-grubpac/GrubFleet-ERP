import type { ReactNode } from "react";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function FleetRegisterEditLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
