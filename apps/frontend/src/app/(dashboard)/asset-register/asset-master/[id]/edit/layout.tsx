import type { ReactNode } from "react";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function AssetMasterEditLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
