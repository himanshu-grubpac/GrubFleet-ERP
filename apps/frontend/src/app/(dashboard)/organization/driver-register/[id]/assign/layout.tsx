import type { ReactNode } from "react";

/** Static export (S3): placeholder segment; runtime ids via client nav + CloudFront fallback. */
export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function AssignDriverToVehicleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
